import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type { Invite } from "../types";

const keys = {
  mine: ["invites", "me"] as const,
  workspace: (workspaceId: string) => ["invites", "workspace", workspaceId] as const,
};

export function useMyInvites() {
  return useQuery({
    queryKey: keys.mine,
    queryFn: async () => {
      const res = await api.get<Invite[]>("/invites/me");
      return res.data;
    },
    refetchInterval: 60_000,
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/invites/${id}/accept`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.mine });
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useRejectInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/invites/${id}/reject`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.mine }),
  });
}

export function useWorkspaceInvites(workspaceId: string | null | undefined) {
  return useQuery({
    enabled: !!workspaceId,
    queryKey: keys.workspace(workspaceId ?? ""),
    queryFn: async () => {
      const res = await api.get<Invite[]>(`/workspaces/${workspaceId}/invites`);
      return res.data;
    },
  });
}

export function useInviteByEmail(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await api.post<Invite>(`/workspaces/${workspaceId}/invites`, { email });
      return res.data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: keys.workspace(workspaceId) }),
  });
}

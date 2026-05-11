import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type { UserSummary } from "../types";

interface MembershipRow {
  id: string;
  workspaceId: string;
  userId: string;
  user: UserSummary;
}

const keys = {
  list: (workspaceId: string) => ["workspaceUsers", workspaceId] as const,
};

export function useWorkspaceMembers(workspaceId: string | null | undefined) {
  return useQuery({
    enabled: !!workspaceId,
    queryKey: keys.list(workspaceId ?? ""),
    queryFn: async () => {
      const res = await api.get<MembershipRow[]>(`/workspaces/${workspaceId}/users`);
      return res.data;
    },
  });
}

export function useRemoveWorkspaceMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/workspaces/${workspaceId}/users/${userId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(workspaceId) }),
  });
}

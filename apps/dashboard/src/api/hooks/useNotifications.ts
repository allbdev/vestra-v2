import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { NotificationDto } from "@vestra/types";
import { api } from "../client";

interface ListResponse {
  items: NotificationDto[];
  nextCursor: string | null;
}

export const notificationKeys = {
  list: ["notifications", "list"] as const,
  unread: ["notifications", "unread-count"] as const,
  workspacePrefs: ["notifications", "workspace-prefs"] as const,
};

export interface WorkspacePref {
  workspaceId: string;
  muted: boolean;
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: notificationKeys.list,
    queryFn: async ({ pageParam }) => {
      const res = await api.get<ListResponse>("/notifications", {
        params: { cursor: pageParam, limit: 20 },
      });
      return res.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: async () => {
      const res = await api.get<{ count: number }>("/notifications/unread-count");
      return res.data.count;
    },
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.list });
      qc.invalidateQueries({ queryKey: notificationKeys.unread });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch("/notifications/read-all");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.list });
      qc.invalidateQueries({ queryKey: notificationKeys.unread });
    },
  });
}

export function useWorkspaceNotificationPrefs() {
  return useQuery({
    queryKey: notificationKeys.workspacePrefs,
    queryFn: async () => {
      const res = await api.get<{ prefs: WorkspacePref[] }>(
        "/notifications/workspace-prefs",
      );
      return res.data.prefs;
    },
  });
}

export function useSetWorkspaceNotificationPref() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workspaceId,
      muted,
    }: {
      workspaceId: string;
      muted: boolean;
    }) => {
      const res = await api.put<{ muted: boolean }>(
        `/workspaces/${workspaceId}/notification-prefs/me`,
        { muted },
      );
      return { workspaceId, muted: res.data.muted };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.workspacePrefs });
    },
  });
}

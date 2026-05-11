import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type { Category } from "../types";

const keys = {
  list: (workspaceId: string) => ["categories", workspaceId] as const,
};

interface CategoryListShape {
  categories?: Category[];
}

export function useCategories(workspaceId: string | null | undefined) {
  return useQuery({
    enabled: !!workspaceId,
    queryKey: keys.list(workspaceId ?? ""),
    queryFn: async () => {
      const res = await api.get<CategoryListShape | Category[]>(
        `/workspaces/${workspaceId}/categories`,
      );
      return Array.isArray(res.data) ? res.data : res.data.categories ?? [];
    },
  });
}

export interface CategoryInput {
  name: string;
  type: 1 | 2;
  color?: string | null;
}

export function useCreateCategory(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CategoryInput) => {
      const res = await api.post<Category>(
        `/workspaces/${workspaceId}/categories`,
        input,
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(workspaceId) }),
  });
}

export function useUpdateCategory(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: CategoryInput & { id: string }) => {
      const res = await api.patch<Category>(
        `/workspaces/${workspaceId}/categories/${id}`,
        input,
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(workspaceId) }),
  });
}

export function useDeleteCategory(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workspaces/${workspaceId}/categories/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(workspaceId) }),
  });
}

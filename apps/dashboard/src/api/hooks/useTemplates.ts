import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type { TransactionTemplate } from "../types";

const keys = {
  list: (workspaceId: string) => ["templates", workspaceId] as const,
};

interface ListShape {
  templates?: TransactionTemplate[];
}

export function useTemplates(workspaceId: string | null | undefined) {
  return useQuery({
    enabled: !!workspaceId,
    queryKey: keys.list(workspaceId ?? ""),
    queryFn: async () => {
      const res = await api.get<ListShape | TransactionTemplate[]>(
        `/workspaces/${workspaceId}/transaction-templates`,
      );
      return Array.isArray(res.data) ? res.data : res.data.templates ?? [];
    },
  });
}

export interface TemplateInput {
  description: string;
  baseAmount: number;
  categoryId: string;
  frequency: 1 | 2 | 3 | 4;
  startDate: string;
  active?: boolean;
}

export function useCreateTemplate(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TemplateInput) => {
      const res = await api.post<TransactionTemplate>(
        `/workspaces/${workspaceId}/transaction-templates`,
        input,
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(workspaceId) }),
  });
}

export function useUpdateTemplate(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<TemplateInput> & { id: string }) => {
      const res = await api.patch<TransactionTemplate>(
        `/workspaces/${workspaceId}/transaction-templates/${id}`,
        input,
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(workspaceId) }),
  });
}

export function useDeleteTemplate(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workspaces/${workspaceId}/transaction-templates/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(workspaceId) }),
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type { Transaction } from "../types";

const keys = {
  list: (workspaceId: string, q?: ListQuery) =>
    ["transactions", workspaceId, q ?? null] as const,
};

export interface ListQuery {
  from?: string;
  to?: string;
  categoryId?: string;
}

interface ListShape {
  transactions?: Transaction[];
}

export function useTransactions(
  workspaceId: string | null | undefined,
  query?: ListQuery,
) {
  return useQuery({
    enabled: !!workspaceId,
    queryKey: keys.list(workspaceId ?? "", query),
    queryFn: async () => {
      const res = await api.get<ListShape | Transaction[]>(
        `/workspaces/${workspaceId}/transactions`,
        { params: query },
      );
      return Array.isArray(res.data) ? res.data : res.data.transactions ?? [];
    },
  });
}

export interface TransactionInput {
  description: string;
  amount: number;
  categoryId?: string | null;
  date: string;
  isPaid?: boolean;
  paidAt?: string | null;
}

export function useCreateTransaction(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      const res = await api.post<Transaction>(
        `/workspaces/${workspaceId}/transactions`,
        input,
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", workspaceId] }),
  });
}

export function useUpdateTransaction(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<TransactionInput> & { id: string }) => {
      const res = await api.patch<Transaction>(
        `/workspaces/${workspaceId}/transactions/${id}`,
        input,
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", workspaceId] }),
  });
}

export function useDeleteTransaction(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workspaces/${workspaceId}/transactions/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", workspaceId] }),
  });
}

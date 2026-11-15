import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type { WorkspaceExportFile, WorkspaceImportResult } from "@vestra/types";
import type { Workspace } from "../types";

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post<Workspace>("/workspaces", { name });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export function useRenameWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await api.patch<Workspace>(`/workspaces/${id}`, { name });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workspaces/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export function useCloneWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<Workspace>(`/workspaces/${id}/clone`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

function exportFileName(workspaceName: string): string {
  const slug =
    workspaceName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "workspace";
  const day = new Date().toISOString().slice(0, 10);
  return `vestra-${slug}-${day}.json`;
}

/** Downloads a single JSON file with every live row of the workspace. */
export function useExportWorkspace() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.get<WorkspaceExportFile>(`/workspaces/${id}/export`);
      const file = res.data;
      const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFileName(file.workspace.name);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
      return file;
    },
  });
}

/** Restores an export file into a new workspace. */
export function useImportWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: unknown) => {
      const res = await api.post<WorkspaceImportResult>("/workspaces/import", file);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

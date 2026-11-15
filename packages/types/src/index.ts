// Shared DTO + enum surface. Const objects (instead of TS `enum`) so Node 24
// strip-only TS can consume the source directly without a build step.

export const CategoryType = {
  Income: 1,
  Expense: 2,
} as const;
export type CategoryType = (typeof CategoryType)[keyof typeof CategoryType];

export const Frequency = {
  Daily: 1,
  Weekly: 2,
  Monthly: 3,
  Yearly: 4,
} as const;
export type Frequency = (typeof Frequency)[keyof typeof Frequency];

export const InviteStatus = {
  Waiting: "waiting",
  Accepted: "accepted",
  Rejected: "rejected",
} as const;
export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus];

export const NotificationType = {
  PaymentDue3d: "payment_due_3d",
  PaymentDue2d: "payment_due_2d",
  PaymentDue1d: "payment_due_1d",
  PaymentDueToday: "payment_due_0d",
  PaymentOverdue: "payment_overdue",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export interface NotificationData {
  transactionId?: string;
  amount?: number;
  dueDate?: string;
  workspaceId?: string;
  workspaceName?: string;
  daysLate?: number;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  data: NotificationData | null;
  readAt: string | null;
  createdAt: string;
}

// ── Workspace export / import ────────────────────────────────────────────────
// Single-file JSON snapshot of a workspace. `id` fields are file-local refs
// (the source DB ids) used only to link rows inside the file — the importer
// always generates fresh ids. Bump `version` on breaking shape changes.

export const WORKSPACE_EXPORT_FORMAT = "vestra-workspace-export" as const;
export const WORKSPACE_EXPORT_VERSION = 1 as const;

export interface WorkspaceExportCategory {
  id: string;
  name: string;
  type: CategoryType;
  color: string | null;
}

export interface WorkspaceExportTemplate {
  id: string;
  categoryId: string | null;
  description: string;
  baseAmount: number;
  frequency: Frequency | null;
  /** YYYY-MM-DD */
  startDate: string;
  active: boolean;
}

export interface WorkspaceExportTransaction {
  id: string;
  categoryId: string | null;
  templateId: string | null;
  description: string;
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  isPaid: boolean;
  /** ISO timestamp */
  paidAt: string | null;
}

export interface WorkspaceExportFile {
  format: typeof WORKSPACE_EXPORT_FORMAT;
  version: typeof WORKSPACE_EXPORT_VERSION;
  /** ISO timestamp */
  exportedAt: string;
  workspace: { name: string };
  categories: WorkspaceExportCategory[];
  templates: WorkspaceExportTemplate[];
  transactions: WorkspaceExportTransaction[];
}

export interface WorkspaceImportResult {
  workspace: { id: string; name: string };
  counts: { categories: number; templates: number; transactions: number };
}

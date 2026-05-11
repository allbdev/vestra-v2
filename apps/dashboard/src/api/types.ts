// Shapes returned by the api. Mirror what apps/api actually serializes.

export interface UserSummary {
  id: string;
  name: string | null;
  email: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isOwner: boolean;
  owner?: UserSummary;
  users?: Array<{ id: string; userId: string; user: UserSummary }>;
  _count?: { categories: number; transactions: number };
}

export interface Category {
  id: string;
  workspaceId: string;
  ownerId: string;
  name: string;
  /** 1 = Income, 2 = Expense */
  type: 1 | 2;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: UserSummary;
}

export interface TransactionTemplate {
  id: string;
  workspaceId: string;
  ownerId: string;
  categoryId: string | null;
  description: string;
  baseAmount: string | number;
  frequency: 1 | 2 | 3 | 4 | null;
  startDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Pick<Category, "id" | "name" | "type" | "color"> | null;
  owner?: UserSummary;
}

export interface Transaction {
  id: string;
  workspaceId: string;
  ownerId: string;
  categoryId: string | null;
  templateId: string | null;
  description: string;
  amount: string | number;
  date: string;
  isPaid: boolean;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  category?: Pick<Category, "id" | "name" | "type" | "color"> | null;
  owner?: UserSummary;
}

export interface Invite {
  id: string;
  workspaceId: string;
  userId: string;
  status: "waiting" | "accepted" | "rejected";
  createdAt: string;
  workspace?: { id: string; name: string; ownerId: string };
  user?: UserSummary;
}

export const toNumber = (v: string | number | null | undefined): number =>
  v === null || v === undefined ? 0 : typeof v === "number" ? v : Number(v);

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

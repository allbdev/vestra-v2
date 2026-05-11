// Shared DTO + enum surface. Populated as apps/api endpoints land.

export enum CategoryType {
  Income = 1,
  Expense = 2,
}

export enum Frequency {
  Daily = 1,
  Weekly = 2,
  Monthly = 3,
  Yearly = 4,
}

export enum InviteStatus {
  Waiting = "waiting",
  Accepted = "accepted",
  Rejected = "rejected",
}

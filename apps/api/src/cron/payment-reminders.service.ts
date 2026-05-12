import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { CategoryType, NotificationType } from "@vestra/types";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "America/Sao_Paulo";
const OFFSET_TYPE: Record<number, string> = {
  3: NotificationType.PaymentDue3d,
  2: NotificationType.PaymentDue2d,
  1: NotificationType.PaymentDue1d,
  0: NotificationType.PaymentDueToday,
};

function brl(amount: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

@Injectable()
export class PaymentRemindersService {
  private readonly logger = new Logger(PaymentRemindersService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  @Cron("0 6 * * *", { name: "payment-reminders", timeZone: TZ })
  async runScheduled() {
    const result = await this.run();
    this.logger.log(
      `Payment reminders: ${result.created} created, ${result.overdue} overdue`,
    );
  }

  async run() {
    // Anchor "today" to a calendar day in BRT, then express it as UTC
    // midnight so it matches Prisma's serialization of `@db.Date` columns
    // (which round-trip as UTC midnight JS Date). This avoids off-by-one
    // shifts caused by mixing BRT midnight (03:00 UTC) with UTC-stored dates.
    const todayIso = dayjs().tz(TZ).format("YYYY-MM-DD");
    const todayUtc = dayjs.utc(todayIso);
    let created = 0;
    let overdueCount = 0;

    const mutedRows = await this.prisma.workspaceNotificationPref.findMany({
      where: { muted: true },
      select: { userId: true, workspaceId: true },
    });
    const muted = new Set(mutedRows.map((r) => `${r.userId}:${r.workspaceId}`));
    const isMuted = (userId: string, workspaceId: string) =>
      muted.has(`${userId}:${workspaceId}`);

    for (const offset of [3, 2, 1, 0]) {
      const target = todayUtc.add(offset, "day");
      const startOfDay = target.toDate();
      const endOfDay = target.add(1, "day").toDate();
      const transactions = await this.prisma.transaction.findMany({
        where: {
          isPaid: false,
          deletedAt: null,
          date: { gte: startOfDay, lt: endOfDay },
          category: { type: CategoryType.Expense, deletedAt: null },
        },
        include: { category: true, workspace: { select: { name: true } } },
      });

      for (const t of transactions) {
        if (isMuted(t.ownerId, t.workspaceId)) continue;
        const amount = Number(t.amount);
        const dueIso = dayjs.utc(t.date).format("YYYY-MM-DD");
        const workspaceName = t.workspace?.name ?? "";
        const title =
          offset === 0
            ? "Pagamento vence hoje"
            : `Pagamento vence em ${offset} ${offset === 1 ? "dia" : "dias"}`;
        const body =
          `${t.description} — ${brl(amount)}` +
          (workspaceName ? ` · ${workspaceName}` : "");
        const result = await this.notifications.create({
          userId: t.ownerId,
          workspaceId: t.workspaceId,
          type: OFFSET_TYPE[offset]!,
          title,
          body,
          data: {
            transactionId: t.id,
            amount,
            dueDate: dueIso,
            workspaceId: t.workspaceId,
            workspaceName,
          },
          dedupeKey: `${OFFSET_TYPE[offset]}:${t.id}`,
        });
        if (result) created++;
      }
    }

    const overdueRows = await this.prisma.transaction.findMany({
      where: {
        isPaid: false,
        deletedAt: null,
        date: { lt: todayUtc.toDate() },
        category: { type: CategoryType.Expense, deletedAt: null },
      },
      include: { category: true, workspace: { select: { name: true } } },
    });
    const todayKey = todayUtc.format("YYYY-MM-DD");
    for (const t of overdueRows) {
      if (isMuted(t.ownerId, t.workspaceId)) continue;
      const amount = Number(t.amount);
      const dueDay = dayjs.utc(t.date).startOf("day");
      const daysLate = todayUtc.diff(dueDay, "day");
      const workspaceName = t.workspace?.name ?? "";
      const title = "Pagamento em atraso";
      const lateStr = daysLate === 1 ? "1 dia em atraso" : `${daysLate} dias em atraso`;
      const body =
        `${t.description} — ${brl(amount)} (${lateStr})` +
        (workspaceName ? ` · ${workspaceName}` : "");
      const result = await this.notifications.create({
        userId: t.ownerId,
        workspaceId: t.workspaceId,
        type: NotificationType.PaymentOverdue,
        title,
        body,
        data: {
          transactionId: t.id,
          amount,
          dueDate: dueDay.format("YYYY-MM-DD"),
          workspaceId: t.workspaceId,
          workspaceName,
          daysLate,
        },
        dedupeKey: `${NotificationType.PaymentOverdue}:${t.id}:${todayKey}`,
      });
      if (result) overdueCount++;
    }

    return { created, overdue: overdueCount };
  }
}

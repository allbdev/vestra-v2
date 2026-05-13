import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import { PrismaService } from "../prisma/prisma.service";
import { Frequency } from "@vestra/types";

dayjs.extend(isSameOrBefore);

@Injectable()
export class RecurringTransactionsService {
  private readonly logger = new Logger(RecurringTransactionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Runs every day at 04:00. Generates Transaction rows from active templates
   * for the current window per frequency (year for monthly, month for weekly,
   * week for daily). Idempotent on (templateId, date).
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM, { name: "generate-recurring-transactions" })
  async runScheduled() {
    const result = await this.generate();
    this.logger.log(`Generated ${result.created} recurring transactions`);
  }

  async generate() {
    const templates = await this.prisma.transactionTemplate.findMany({
      where: { active: true, deletedAt: null },
    });

    const now = dayjs();
    const currentYear = now.year();
    let created = 0;

    for (const tpl of templates) {
      if (!tpl.frequency || !tpl.startDate) continue;
      const startDate = dayjs(tpl.startDate);
      const targets: dayjs.Dayjs[] = [];

      if (tpl.frequency === Frequency.Monthly) {
        for (let month = 0; month < 12; month++) {
          const monthStart = dayjs().year(currentYear).month(month).startOf("month");
          const daysInMonth = monthStart.daysInMonth();
          const desiredDay = startDate.date();
          const targetDate = monthStart.date(Math.min(desiredDay, daysInMonth));
          if (targetDate.isBefore(startDate, "day")) continue;
          targets.push(targetDate);
        }
      } else if (tpl.frequency === Frequency.Weekly) {
        const startOfMonth = now.startOf("month");
        const endOfMonth = now.endOf("month");
        const desiredDow = startDate.day();
        let iter = startOfMonth;
        while (iter.isSameOrBefore(endOfMonth, "day")) {
          if (iter.day() === desiredDow && !iter.isBefore(startDate, "day")) {
            targets.push(iter);
          }
          iter = iter.add(1, "day");
        }
      } else if (tpl.frequency === Frequency.Daily) {
        const startOfWeek = now.startOf("week");
        const endOfWeek = now.endOf("week");
        let iter = startOfWeek;
        while (iter.isSameOrBefore(endOfWeek, "day")) {
          if (!iter.isBefore(startDate, "day")) targets.push(iter);
          iter = iter.add(1, "day");
        }
      } else if (tpl.frequency === Frequency.Yearly) {
        const target = startDate.year(currentYear);
        if (!target.isBefore(startDate, "day")) targets.push(target);
      }

      for (const date of targets) {
        const startOfDay = date.startOf("day").toDate();

        // Idempotency window = the recurrence period, not the target day.
        // A user may edit a generated transaction's date inside the same
        // period (e.g. move a monthly entry from the 10th to the 15th);
        // re-checking only the original day would miss it and duplicate.
        let rangeStart: Date;
        let rangeEnd: Date;
        if (tpl.frequency === Frequency.Monthly) {
          rangeStart = date.startOf("month").toDate();
          rangeEnd = date.endOf("month").toDate();
        } else if (tpl.frequency === Frequency.Weekly) {
          rangeStart = date.startOf("week").toDate();
          rangeEnd = date.endOf("week").toDate();
        } else if (tpl.frequency === Frequency.Yearly) {
          rangeStart = date.startOf("year").toDate();
          rangeEnd = date.endOf("year").toDate();
        } else {
          rangeStart = startOfDay;
          rangeEnd = date.endOf("day").toDate();
        }

        const exists = await this.prisma.transaction.findFirst({
          where: {
            templateId: tpl.id,
            date: { gte: rangeStart, lte: rangeEnd },
          },
        });
        if (exists) continue;

        await this.prisma.transaction.create({
          data: {
            workspaceId: tpl.workspaceId,
            ownerId: tpl.ownerId,
            categoryId: tpl.categoryId,
            templateId: tpl.id,
            description: tpl.description,
            amount: tpl.baseAmount,
            date: startOfDay,
            isPaid: false,
          },
        });
        created++;
      }
    }

    return { created };
  }
}

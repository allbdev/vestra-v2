import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { CronController } from "./cron.controller";
import { PaymentRemindersService } from "./payment-reminders.service";
import { RecurringTransactionsService } from "./recurring-transactions.service";

@Module({
  imports: [NotificationsModule],
  controllers: [CronController],
  providers: [RecurringTransactionsService, PaymentRemindersService],
})
export class CronModule {}

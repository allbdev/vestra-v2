import { Module } from "@nestjs/common";
import { CronController } from "./cron.controller";
import { RecurringTransactionsService } from "./recurring-transactions.service";

@Module({
  controllers: [CronController],
  providers: [RecurringTransactionsService],
})
export class CronModule {}

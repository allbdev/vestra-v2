import { Module } from "@nestjs/common";
import { CronModule } from "../cron/cron.module";
import { TransactionTemplatesController } from "./transaction-templates.controller";
import { TransactionTemplatesService } from "./transaction-templates.service";

@Module({
  imports: [CronModule],
  controllers: [TransactionTemplatesController],
  providers: [TransactionTemplatesService],
  exports: [TransactionTemplatesService],
})
export class TransactionTemplatesModule {}

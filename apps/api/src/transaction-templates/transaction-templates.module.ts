import { Module } from "@nestjs/common";
import { TransactionTemplatesController } from "./transaction-templates.controller";
import { TransactionTemplatesService } from "./transaction-templates.service";

@Module({
  controllers: [TransactionTemplatesController],
  providers: [TransactionTemplatesService],
  exports: [TransactionTemplatesService],
})
export class TransactionTemplatesModule {}

import { Controller, ForbiddenException, Headers, Post } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags } from "@nestjs/swagger";
import { PaymentRemindersService } from "./payment-reminders.service";
import { RecurringTransactionsService } from "./recurring-transactions.service";
import { Public } from "../common/decorators/public.decorator";

@ApiTags("cron")
@Controller("cron")
export class CronController {
  constructor(
    private recurring: RecurringTransactionsService,
    private reminders: PaymentRemindersService,
    private config: ConfigService,
  ) {}

  private requireSecret(auth: string | undefined) {
    const secret = this.config.get<string>("CRON_SECRET");
    if (!secret || auth !== `Bearer ${secret}`) {
      throw new ForbiddenException("Invalid cron secret");
    }
  }

  @Public()
  @Post("transactions")
  trigger(@Headers("authorization") auth: string | undefined) {
    this.requireSecret(auth);
    return this.recurring.generate();
  }

  @Public()
  @Post("payment-reminders")
  triggerReminders(@Headers("authorization") auth: string | undefined) {
    this.requireSecret(auth);
    return this.reminders.run();
  }
}

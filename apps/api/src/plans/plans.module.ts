import { Global, Module } from "@nestjs/common";
import { PlansController } from "./plans.controller";
import { PlansService } from "./plans.service";
import { SubscriptionService } from "./subscription.service";

@Global()
@Module({
  controllers: [PlansController],
  providers: [PlansService, SubscriptionService],
  exports: [SubscriptionService],
})
export class PlansModule {}

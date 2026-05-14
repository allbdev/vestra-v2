import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { OnboardingService } from "./onboarding.service";
import { CompleteOnboardingDto } from "./dto/onboarding.dto";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";

@ApiBearerAuth()
@ApiTags("onboarding")
@Controller("onboarding/me")
export class OnboardingController {
  constructor(private onboarding: OnboardingService) {}

  @Get()
  current(@CurrentUser() user: RequestUser) {
    return this.onboarding.getCurrent(user.id);
  }

  @Post("complete")
  complete(@CurrentUser() user: RequestUser, @Body() dto: CompleteOnboardingDto) {
    return this.onboarding.complete(user.id, dto.step);
  }
}

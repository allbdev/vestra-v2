import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PlansService } from "./plans.service";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";

@ApiBearerAuth()
@ApiTags("plans")
@Controller("plans")
export class PlansController {
  constructor(private plans: PlansService) {}

  @Public()
  @Get()
  list() {
    return this.plans.list();
  }

  @Get("me")
  current(@CurrentUser() user: RequestUser) {
    return this.plans.current(user.id);
  }
}

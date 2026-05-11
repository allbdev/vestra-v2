import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";

@ApiBearerAuth()
@ApiTags("users")
@Controller("users")
export class UsersController {
  @Get("me")
  me(@CurrentUser() user: RequestUser) {
    return user;
  }
}

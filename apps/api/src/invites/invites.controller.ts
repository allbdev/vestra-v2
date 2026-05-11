import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { InvitesService } from "./invites.service";
import { CreateInviteDto } from "./dto/invite.dto";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { WorkspaceMemberGuard } from "../common/guards/workspace-member.guard";
import { WorkspaceOwnerGuard } from "../common/guards/workspace-owner.guard";

@ApiBearerAuth()
@ApiTags("invites")
@Controller()
export class InvitesController {
  constructor(private invites: InvitesService) {}

  @Get("invites/me")
  myInvites(@CurrentUser() user: RequestUser) {
    return this.invites.listForUser(user.id);
  }

  @Post("invites/:id/accept")
  @HttpCode(HttpStatus.OK)
  accept(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.invites.accept(id, user.id);
  }

  @Post("invites/:id/reject")
  @HttpCode(HttpStatus.OK)
  reject(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.invites.reject(id, user.id);
  }

  @UseGuards(WorkspaceMemberGuard)
  @Get("workspaces/:workspaceId/invites")
  list(@Param("workspaceId") workspaceId: string) {
    return this.invites.listForWorkspace(workspaceId);
  }

  @UseGuards(WorkspaceOwnerGuard)
  @Post("workspaces/:workspaceId/invites")
  create(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateInviteDto,
  ) {
    return this.invites.create(workspaceId, user.id, dto.email);
  }
}

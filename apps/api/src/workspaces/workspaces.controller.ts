import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { WorkspacesService } from "./workspaces.service";
import { CreateWorkspaceDto, UpdateWorkspaceDto } from "./dto/workspace.dto";
import { ImportWorkspaceDto } from "./dto/workspace-import.dto";
import { WorkspaceTransferService } from "./workspace-transfer.service";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { WorkspaceMemberGuard } from "../common/guards/workspace-member.guard";
import { WorkspaceOwnerGuard } from "../common/guards/workspace-owner.guard";

@ApiBearerAuth()
@ApiTags("workspaces")
@Controller("workspaces")
export class WorkspacesController {
  constructor(
    private workspaces: WorkspacesService,
    private transfer: WorkspaceTransferService,
  ) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.workspaces.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateWorkspaceDto) {
    return this.workspaces.create(user.id, dto.name);
  }

  /** Restore a single-file export into a new workspace owned by the caller. */
  @Post("import")
  import(@CurrentUser() user: RequestUser, @Body() dto: ImportWorkspaceDto) {
    return this.transfer.import(user.id, dto);
  }

  @UseGuards(WorkspaceMemberGuard)
  @Get(":id/export")
  export(@Param("id") id: string) {
    return this.transfer.export(id);
  }

  @UseGuards(WorkspaceMemberGuard)
  @Get(":id")
  get(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.workspaces.get(id, user.id);
  }

  @UseGuards(WorkspaceOwnerGuard)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateWorkspaceDto) {
    return this.workspaces.update(id, dto.name);
  }

  @UseGuards(WorkspaceOwnerGuard)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.workspaces.softDelete(id);
  }

  @UseGuards(WorkspaceOwnerGuard)
  @Post(":id/clone")
  clone(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.workspaces.clone(id, user.id);
  }

  @UseGuards(WorkspaceMemberGuard)
  @Get(":id/users")
  listUsers(@Param("id") id: string) {
    return this.workspaces.listUsers(id);
  }

  @UseGuards(WorkspaceMemberGuard)
  @Delete(":id/users/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeUser(
    @Param("id") workspaceId: string,
    @Param("userId") userId: string,
    @CurrentUser() me: RequestUser,
  ) {
    await this.workspaces.removeUser(workspaceId, userId, me.id);
  }
}

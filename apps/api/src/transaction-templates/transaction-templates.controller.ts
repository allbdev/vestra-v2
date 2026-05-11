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
import { TransactionTemplatesService } from "./transaction-templates.service";
import {
  CreateTransactionTemplateDto,
  UpdateTransactionTemplateDto,
} from "./dto/transaction-template.dto";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { WorkspaceMemberGuard } from "../common/guards/workspace-member.guard";

@ApiBearerAuth()
@ApiTags("transaction-templates")
@UseGuards(WorkspaceMemberGuard)
@Controller("workspaces/:workspaceId/transaction-templates")
export class TransactionTemplatesController {
  constructor(private templates: TransactionTemplatesService) {}

  @Get()
  list(@Param("workspaceId") workspaceId: string) {
    return this.templates.list(workspaceId);
  }

  @Post()
  create(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTransactionTemplateDto,
  ) {
    return this.templates.create(workspaceId, user.id, dto);
  }

  @Get(":id")
  get(@Param("workspaceId") workspaceId: string, @Param("id") id: string) {
    return this.templates.get(id, workspaceId);
  }

  @Patch(":id")
  update(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateTransactionTemplateDto,
  ) {
    return this.templates.update(id, workspaceId, user.id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.templates.softDelete(id, workspaceId, user.id);
  }
}

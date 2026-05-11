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
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { TransactionsService } from "./transactions.service";
import {
  CreateTransactionDto,
  ListTransactionsQueryDto,
  UpdateTransactionDto,
} from "./dto/transaction.dto";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { WorkspaceMemberGuard } from "../common/guards/workspace-member.guard";

@ApiBearerAuth()
@ApiTags("transactions")
@UseGuards(WorkspaceMemberGuard)
@Controller("workspaces/:workspaceId/transactions")
export class TransactionsController {
  constructor(private transactions: TransactionsService) {}

  @Get()
  list(
    @Param("workspaceId") workspaceId: string,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.transactions.list(workspaceId, query);
  }

  @Post()
  create(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactions.create(workspaceId, user.id, dto);
  }

  @Get(":id")
  get(@Param("workspaceId") workspaceId: string, @Param("id") id: string) {
    return this.transactions.get(id, workspaceId);
  }

  @Patch(":id")
  update(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactions.update(id, workspaceId, user.id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.transactions.softDelete(id, workspaceId, user.id);
  }
}

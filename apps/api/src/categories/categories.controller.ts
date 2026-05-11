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
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { WorkspaceMemberGuard } from "../common/guards/workspace-member.guard";

@ApiBearerAuth()
@ApiTags("categories")
@UseGuards(WorkspaceMemberGuard)
@Controller("workspaces/:workspaceId/categories")
export class CategoriesController {
  constructor(private categories: CategoriesService) {}

  @Get()
  list(@Param("workspaceId") workspaceId: string) {
    return this.categories.list(workspaceId);
  }

  @Post()
  create(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categories.create(workspaceId, user.id, dto);
  }

  @Get(":id")
  get(@Param("workspaceId") workspaceId: string, @Param("id") id: string) {
    return this.categories.get(id, workspaceId);
  }

  @Patch(":id")
  update(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(id, workspaceId, user.id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.categories.softDelete(id, workspaceId, user.id);
  }
}

import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { DashboardQueryDto } from "./dto/dashboard.dto";
import { WorkspaceMemberGuard } from "../common/guards/workspace-member.guard";

@ApiBearerAuth()
@ApiTags("dashboard")
@UseGuards(WorkspaceMemberGuard)
@Controller("workspaces/:workspaceId/dashboard")
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get()
  get(
    @Param("workspaceId") workspaceId: string,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboard.build(workspaceId, query);
  }
}

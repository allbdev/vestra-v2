import { Module } from "@nestjs/common";
import { WorkspacesController } from "./workspaces.controller";
import { WorkspacesService } from "./workspaces.service";
import { WorkspaceTransferService } from "./workspace-transfer.service";

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspaceTransferService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}

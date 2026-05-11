import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface WorkspaceAccess {
  workspaceId: string;
  isOwner: boolean;
  isMember: boolean;
}

/**
 * Returns the workspace access info attached by WorkspaceMemberGuard / WorkspaceOwnerGuard.
 */
export const WorkspaceAccessCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WorkspaceAccess => {
    const req = ctx.switchToHttp().getRequest();
    return req.workspaceAccess as WorkspaceAccess;
  },
);

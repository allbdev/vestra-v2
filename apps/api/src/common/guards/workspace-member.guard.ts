import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { RequestUser } from "../decorators/current-user.decorator";
import type { WorkspaceAccess } from "../decorators/workspace-access.decorator";

/**
 * Verifies `req.user` is owner OR member of `:workspaceId` (path param).
 * Attaches `req.workspaceAccess = { workspaceId, isOwner, isMember }`.
 */
@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as RequestUser | undefined;
    if (!user) throw new ForbiddenException("Not authenticated");

    const workspaceId = req.params?.workspaceId ?? req.params?.id;
    if (!workspaceId) throw new ForbiddenException("Missing workspace id");

    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      include: {
        users: { where: { userId: user.id, deletedAt: null }, take: 1 },
      },
    });
    if (!workspace) throw new NotFoundException("Workspace not found");

    const isOwner = workspace.ownerId === user.id;
    const isMember = workspace.users.length > 0;
    if (!isOwner && !isMember) throw new ForbiddenException("No workspace access");

    const access: WorkspaceAccess = { workspaceId, isOwner, isMember };
    req.workspaceAccess = access;
    return true;
  }
}

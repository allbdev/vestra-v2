import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { RequestUser } from "../decorators/current-user.decorator";

/**
 * Owner-only routes (rename/delete workspace, manage invites, remove users).
 * Must be chained AFTER JwtAuthGuard.
 */
@Injectable()
export class WorkspaceOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as RequestUser | undefined;
    if (!user) throw new ForbiddenException("Not authenticated");

    const workspaceId = req.params?.workspaceId ?? req.params?.id;
    if (!workspaceId) throw new ForbiddenException("Missing workspace id");

    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      select: { id: true, ownerId: true },
    });
    if (!workspace) throw new NotFoundException("Workspace not found");
    if (workspace.ownerId !== user.id) throw new ForbiddenException("Owner only");

    req.workspaceAccess = { workspaceId, isOwner: true, isMember: true };
    return true;
  }
}

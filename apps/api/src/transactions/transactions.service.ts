import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateTransactionDto,
  ListTransactionsQueryDto,
  UpdateTransactionDto,
} from "./dto/transaction.dto";

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  list(workspaceId: string, query: ListTransactionsQueryDto) {
    return this.prisma.transaction.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.from || query.to
          ? {
              date: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true, type: true, color: true } },
      },
      orderBy: { date: "desc" },
    });
  }

  async get(id: string, workspaceId: string) {
    const row = await this.prisma.transaction.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true, type: true, color: true } },
      },
    });
    if (!row) throw new NotFoundException("Transaction not found");
    return row;
  }

  create(workspaceId: string, ownerId: string, dto: CreateTransactionDto) {
    const isPaid = dto.isPaid ?? false;
    return this.prisma.transaction.create({
      data: {
        workspaceId,
        ownerId,
        description: dto.description,
        amount: dto.amount,
        categoryId: dto.categoryId,
        date: new Date(dto.date),
        isPaid,
        paidAt: isPaid && dto.paidAt ? new Date(dto.paidAt) : null,
      },
    });
  }

  async update(id: string, workspaceId: string, userId: string, dto: UpdateTransactionDto) {
    const row = await this.prisma.transaction.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Transaction not found");
    if (row.ownerId !== userId) throw new ForbiddenException("Only the creator can edit");

    const nextIsPaid = dto.isPaid ?? row.isPaid;
    let nextPaidAt: Date | null | undefined;
    if (dto.isPaid === false) {
      nextPaidAt = null;
    } else if (dto.paidAt !== undefined) {
      nextPaidAt = dto.paidAt ? new Date(dto.paidAt) : null;
    } else if (dto.isPaid === true && !row.paidAt) {
      nextPaidAt = new Date();
    } else {
      nextPaidAt = undefined;
    }

    return this.prisma.transaction.update({
      where: { id },
      data: {
        description: dto.description,
        amount: dto.amount,
        categoryId: dto.categoryId,
        date: dto.date ? new Date(dto.date) : undefined,
        isPaid: dto.isPaid !== undefined ? nextIsPaid : undefined,
        paidAt: nextPaidAt,
      },
    });
  }

  async softDelete(id: string, workspaceId: string, userId: string) {
    const row = await this.prisma.transaction.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Transaction not found");
    if (row.ownerId !== userId) throw new ForbiddenException("Only the creator can delete");

    return this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

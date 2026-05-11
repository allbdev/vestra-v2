import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateTransactionTemplateDto,
  UpdateTransactionTemplateDto,
} from "./dto/transaction-template.dto";

@Injectable()
export class TransactionTemplatesService {
  constructor(private prisma: PrismaService) {}

  list(workspaceId: string) {
    return this.prisma.transactionTemplate.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true, type: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(id: string, workspaceId: string) {
    const row = await this.prisma.transactionTemplate.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true, type: true, color: true } },
      },
    });
    if (!row) throw new NotFoundException("Template not found");
    return row;
  }

  create(workspaceId: string, ownerId: string, dto: CreateTransactionTemplateDto) {
    return this.prisma.transactionTemplate.create({
      data: {
        workspaceId,
        ownerId,
        description: dto.description,
        baseAmount: dto.baseAmount,
        categoryId: dto.categoryId,
        frequency: dto.frequency,
        startDate: new Date(dto.startDate),
        active: dto.active ?? true,
      },
    });
  }

  async update(
    id: string,
    workspaceId: string,
    userId: string,
    dto: UpdateTransactionTemplateDto,
  ) {
    const row = await this.prisma.transactionTemplate.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Template not found");
    if (row.ownerId !== userId) throw new ForbiddenException("Only the creator can edit");

    return this.prisma.transactionTemplate.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      },
    });
  }

  async softDelete(id: string, workspaceId: string, userId: string) {
    const row = await this.prisma.transactionTemplate.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Template not found");
    if (row.ownerId !== userId) throw new ForbiddenException("Only the creator can delete");

    return this.prisma.transactionTemplate.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }
}

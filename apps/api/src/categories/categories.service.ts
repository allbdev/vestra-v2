import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  list(workspaceId: string) {
    return this.prisma.category.findMany({
      where: { workspaceId, deletedAt: null },
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { name: "asc" },
    });
  }

  async get(id: string, workspaceId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  create(workspaceId: string, ownerId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        workspaceId,
        ownerId,
        name: dto.name,
        type: dto.type,
        color: dto.color,
      },
    });
  }

  async update(id: string, workspaceId: string, userId: string, dto: UpdateCategoryDto) {
    const row = await this.prisma.category.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Category not found");
    if (row.ownerId !== userId) throw new ForbiddenException("Only the creator can edit");

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async softDelete(id: string, workspaceId: string, userId: string) {
    const row = await this.prisma.category.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Category not found");
    if (row.ownerId !== userId) throw new ForbiddenException("Only the creator can delete");

    const inUse = await this.prisma.transaction.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (inUse > 0) {
      throw new BadRequestException("Category is in use by transactions");
    }

    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

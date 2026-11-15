import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  WORKSPACE_EXPORT_FORMAT,
  WORKSPACE_EXPORT_VERSION,
  type CategoryType,
  type Frequency,
  type WorkspaceExportFile,
  type WorkspaceImportResult,
} from "@vestra/types";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionService } from "../plans/subscription.service";
import { mapOptionalForeignKey } from "./clone-workspace-maps";
import type { ImportWorkspaceDto } from "./dto/workspace-import.dto";

const CHUNK_SIZE = 1_000;

/** `@db.Date` → "YYYY-MM-DD" (UTC, no TZ shift). */
function toIsoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" → Date at UTC midnight; rejects impossible dates like 2025-02-30. */
function fromIsoDay(value: string, field: string): Date {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || toIsoDay(d) !== value) {
    throw new BadRequestException(`Invalid ${field}: ${value}`);
  }
  return d;
}

function assertUniqueIds(rows: { id: string }[], label: string) {
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.id)) {
      throw new BadRequestException(`Duplicate ${label} id in file: ${r.id}`);
    }
    seen.add(r.id);
  }
}

function chunk<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) out.push(rows.slice(i, i + CHUNK_SIZE));
  return out;
}

@Injectable()
export class WorkspaceTransferService {
  constructor(
    private prisma: PrismaService,
    private subs: SubscriptionService,
  ) {}

  /** Full snapshot of live (non-deleted) rows. Any member may export. */
  async export(workspaceId: string): Promise<WorkspaceExportFile> {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      select: { name: true },
    });
    if (!workspace) throw new NotFoundException("Workspace not found");

    const [categories, templates, transactions] = await Promise.all([
      this.prisma.category.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.transactionTemplate.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.transaction.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    const liveCategoryIds = new Set(categories.map((c) => c.id));
    const liveTemplateIds = new Set(templates.map((t) => t.id));
    // Drop refs to soft-deleted parents so the file is self-consistent.
    const liveRef = (id: string | null, live: Set<string>) => (id && live.has(id) ? id : null);

    return {
      format: WORKSPACE_EXPORT_FORMAT,
      version: WORKSPACE_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      workspace: { name: workspace.name },
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type as CategoryType,
        color: c.color,
      })),
      templates: templates.map((t) => ({
        id: t.id,
        categoryId: liveRef(t.categoryId, liveCategoryIds),
        description: t.description,
        baseAmount: t.baseAmount.toNumber(),
        frequency: (t.frequency ?? null) as Frequency | null,
        startDate: toIsoDay(t.startDate),
        active: t.active,
      })),
      transactions: transactions.map((r) => ({
        id: r.id,
        categoryId: liveRef(r.categoryId, liveCategoryIds),
        templateId: liveRef(r.templateId, liveTemplateIds),
        description: r.description,
        amount: r.amount.toNumber(),
        date: toIsoDay(r.date),
        isPaid: r.isPaid,
        paidAt: r.paidAt ? r.paidAt.toISOString() : null,
      })),
    };
  }

  /**
   * Restores an export file into a brand-new workspace owned by `userId`.
   * Fresh ids everywhere; in-file refs remapped (unknown refs → null).
   * Subject to the same plan limit as create/clone.
   */
  async import(userId: string, file: ImportWorkspaceDto): Promise<WorkspaceImportResult> {
    const limit = await this.subs.checkWorkspaceLimit(userId);
    if (!limit.allowed) {
      throw new ForbiddenException({
        message: "Workspace limit reached for current plan",
        reason: limit.reason,
      });
    }

    assertUniqueIds(file.categories, "category");
    assertUniqueIds(file.templates, "template");
    assertUniqueIds(file.transactions, "transaction");

    const categoryIdMap = new Map(file.categories.map((c) => [c.id, randomUUID()]));
    const templateIdMap = new Map(file.templates.map((t) => [t.id, randomUUID()]));
    const workspaceId = randomUUID();
    const name = file.workspace.name.trim().slice(0, 255) || "Workspace importado";

    // Build + validate every row before opening the transaction.
    const categoryRows = file.categories.map((c) => ({
      id: categoryIdMap.get(c.id)!,
      workspaceId,
      ownerId: userId,
      name: c.name.trim(),
      type: c.type,
      color: c.color ?? null,
    }));
    const templateRows = file.templates.map((t) => ({
      id: templateIdMap.get(t.id)!,
      workspaceId,
      ownerId: userId,
      categoryId: mapOptionalForeignKey(t.categoryId, categoryIdMap),
      description: t.description.trim(),
      baseAmount: t.baseAmount,
      frequency: t.frequency ?? null,
      startDate: fromIsoDay(t.startDate, "template startDate"),
      active: t.active,
    }));
    const transactionRows = file.transactions.map((r) => ({
      id: randomUUID(),
      workspaceId,
      ownerId: userId,
      categoryId: mapOptionalForeignKey(r.categoryId, categoryIdMap),
      templateId: mapOptionalForeignKey(r.templateId, templateIdMap),
      description: r.description.trim(),
      amount: r.amount,
      date: fromIsoDay(r.date, "transaction date"),
      isPaid: r.isPaid,
      paidAt: r.isPaid && r.paidAt ? new Date(r.paidAt) : null,
    }));

    await this.prisma.$transaction(
      async (tx) => {
        await tx.workspace.create({ data: { id: workspaceId, name, ownerId: userId } });
        await tx.workspaceUser.create({ data: { workspaceId, userId } });
        for (const part of chunk(categoryRows)) await tx.category.createMany({ data: part });
        for (const part of chunk(templateRows)) {
          await tx.transactionTemplate.createMany({ data: part });
        }
        for (const part of chunk(transactionRows)) await tx.transaction.createMany({ data: part });
      },
      { maxWait: 10_000, timeout: 120_000 },
    );

    return {
      workspace: { id: workspaceId, name },
      counts: {
        categories: categoryRows.length,
        templates: templateRows.length,
        transactions: transactionRows.length,
      },
    };
  }
}

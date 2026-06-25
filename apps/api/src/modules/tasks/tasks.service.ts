import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EntitlementsService } from "../billing/entitlements.service";

type TaskStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface TaskFilters {
  status?: TaskStatus;
  assignedToId?: string;
  leadId?: string;
  mine?: boolean;
  scope?: "open" | "all";
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueAt?: string | null;
  assignedToId?: string | null;
  leadId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueAt?: string | null;
  assignedToId?: string | null;
}

const taskInclude = {
  assignedTo: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  lead: { select: { id: true, displayName: true, phone: true, stage: true } },
} as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  private async assertMember(organizationId: string, userId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId, userId },
      select: { id: true },
    });
    if (!member) throw new ForbiddenException("Assignee must be a workspace member");
  }

  private async assertLead(organizationId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId },
      select: { id: true },
    });
    if (!lead) throw new NotFoundException("Lead not found");
  }

  async list(user: JwtPayload, filters: TaskFilters) {
    const where: Record<string, unknown> = { organizationId: user.organizationId };
    if (filters.status) where.status = filters.status;
    if (filters.leadId) where.leadId = filters.leadId;
    if (filters.mine) where.assignedToId = user.sub;
    else if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.scope !== "all" && !filters.status) {
      where.status = { in: ["OPEN", "IN_PROGRESS"] };
    }

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      include: taskInclude,
      take: 200,
    });
    return tasks;
  }

  async summary(user: JwtPayload) {
    const now = new Date();
    const [open, dueToday, overdue, mine] = await Promise.all([
      this.prisma.task.count({
        where: { organizationId: user.organizationId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
      this.prisma.task.count({
        where: {
          organizationId: user.organizationId,
          status: { in: ["OPEN", "IN_PROGRESS"] },
          dueAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
        },
      }),
      this.prisma.task.count({
        where: {
          organizationId: user.organizationId,
          status: { in: ["OPEN", "IN_PROGRESS"] },
          dueAt: { lt: now },
        },
      }),
      this.prisma.task.count({
        where: {
          organizationId: user.organizationId,
          assignedToId: user.sub,
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
      }),
    ]);
    return { open, dueToday, overdue, mine };
  }

  async create(user: JwtPayload, input: CreateTaskInput) {
    await this.entitlements.assertHasAccess(user.organizationId);
    const title = input.title.trim();
    if (!title) throw new ForbiddenException("Task title required");
    if (input.assignedToId) await this.assertMember(user.organizationId, input.assignedToId);
    if (input.leadId) await this.assertLead(user.organizationId, input.leadId);

    return this.prisma.task.create({
      data: {
        organizationId: user.organizationId,
        title: title.slice(0, 200),
        description: input.description?.slice(0, 2000) ?? null,
        priority: input.priority ?? "MEDIUM",
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        assignedToId: input.assignedToId ?? null,
        leadId: input.leadId ?? null,
        createdById: user.sub,
      },
      include: taskInclude,
    });
  }

  async update(user: JwtPayload, id: string, input: UpdateTaskInput) {
    const task = await this.prisma.task.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!task) throw new NotFoundException();
    if (input.assignedToId) await this.assertMember(user.organizationId, input.assignedToId);

    const becomingDone = input.status === "DONE" && task.status !== "DONE";

    return this.prisma.task.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim().slice(0, 200) } : {}),
        ...(input.description !== undefined
          ? { description: input.description?.slice(0, 2000) ?? null }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.dueAt !== undefined ? { dueAt: input.dueAt ? new Date(input.dueAt) : null } : {}),
        ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
        ...(becomingDone ? { completedAt: new Date() } : {}),
        ...(input.status && input.status !== "DONE" ? { completedAt: null } : {}),
      },
      include: taskInclude,
    });
  }

  async remove(user: JwtPayload, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!task) throw new NotFoundException();
    await this.prisma.task.delete({ where: { id } });
    return { ok: true };
  }
}

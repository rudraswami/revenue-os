import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const PIPELINE_STAGES = [
  { stage: "NEW", name: "New", order: 0, color: "#6366f1" },
  { stage: "CONTACTED", name: "Contacted", order: 1, color: "#8b5cf6" },
  { stage: "QUALIFIED", name: "Qualified", order: 2, color: "#a855f7" },
  { stage: "PROPOSAL", name: "Proposal", order: 3, color: "#d946ef" },
  { stage: "NEGOTIATION", name: "Negotiation", order: 4, color: "#ec4899" },
  { stage: "WON", name: "Won", order: 5, color: "#22c55e", isWon: true },
  { stage: "LOST", name: "Lost", order: 6, color: "#ef4444", isLost: true },
] as const;

export interface SeedAccountInput {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/** Mirrors apps/api auth.service register — workspace + pipeline + trial. */
export async function seedWorkspaceAccount(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  input: SeedAccountInput,
) {
  const email = input.email.toLowerCase();
  const slug = slugify(input.organizationName);
  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await tx.user.create({
    data: {
      email,
      passwordHash,
      name: input.name,
      emailVerified: new Date(),
    },
  });

  const organization = await tx.organization.create({
    data: { name: input.organizationName, slug },
  });

  await tx.organizationMember.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  await tx.workspace.create({
    data: {
      organizationId: organization.id,
      name: "Default",
      slug: "default",
      isDefault: true,
    },
  });

  await tx.pipelineStage.createMany({
    data: PIPELINE_STAGES.map((s) => ({
      organizationId: organization.id,
      leadStage: s.stage,
      name: s.name,
      order: s.order,
      color: s.color,
      isWon: "isWon" in s ? s.isWon : false,
      isLost: "isLost" in s ? s.isLost : false,
    })),
  });

  await tx.subscription.create({
    data: {
      organizationId: organization.id,
      planId: "trial",
      status: "TRIALING",
    },
  });

  return { user, organization };
}

export async function ensureSeedAccount(input: SeedAccountInput) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const member = await prisma.organizationMember.findFirst({
      where: { userId: existing.id, role: "OWNER" },
      include: { organization: true },
    });
    return {
      created: false as const,
      email,
      organization: member?.organization ?? null,
    };
  }

  const result = await prisma.$transaction((tx) => seedWorkspaceAccount(tx, input));
  return {
    created: true as const,
    email,
    organization: result.organization,
    password: input.password,
  };
}

import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import { LeadsService } from "./leads.service";

describe("LeadsService notes", () => {
  const prisma = {
    lead: { findFirst: jest.fn() },
    leadNote: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };

  const service = new LeadsService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  const owner: JwtPayload = {
    sub: "user_owner",
    organizationId: "org_1",
    role: "OWNER",
    email: "owner@test.com",
  };

  const agent: JwtPayload = {
    sub: "user_agent",
    organizationId: "org_1",
    role: "AGENT",
    email: "agent@test.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("listNotes returns notes for org lead", async () => {
    prisma.lead.findFirst.mockResolvedValue({ id: "lead_1" });
    prisma.leadNote.findMany.mockResolvedValue([
      { id: "n1", body: "Quoted ₹45k", authorId: "user_owner" },
    ]);

    const notes = await service.listNotes(owner, "lead_1");

    expect(notes).toHaveLength(1);
    expect(prisma.leadNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { leadId: "lead_1", organizationId: "org_1" } }),
    );
  });

  it("listNotes throws when lead missing", async () => {
    prisma.lead.findFirst.mockResolvedValue(null);
    await expect(service.listNotes(owner, "missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("deleteNote allows author", async () => {
    prisma.leadNote.findFirst.mockResolvedValue({ id: "n1", authorId: "user_agent" });
    prisma.leadNote.delete.mockResolvedValue({});

    const result = await service.deleteNote(agent, "lead_1", "n1");

    expect(result).toEqual({ ok: true });
    expect(prisma.leadNote.delete).toHaveBeenCalledWith({ where: { id: "n1" } });
  });

  it("deleteNote allows team manager on others notes", async () => {
    prisma.leadNote.findFirst.mockResolvedValue({ id: "n1", authorId: "user_other" });

    await expect(service.deleteNote(owner, "lead_1", "n1")).resolves.toEqual({ ok: true });
  });

  it("deleteNote rejects non-author agent without team.manage", async () => {
    prisma.leadNote.findFirst.mockResolvedValue({ id: "n1", authorId: "user_other" });

    await expect(service.deleteNote(agent, "lead_1", "n1")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.leadNote.delete).not.toHaveBeenCalled();
  });
});

import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import { ConversationsService } from "./conversations.service";

describe("ConversationsService.getThreadBundle", () => {
  const prisma = {
    conversation: { findFirst: jest.fn() },
    message: { findMany: jest.fn() },
    aiRun: { findFirst: jest.fn() },
    conversationMemory: { findMany: jest.fn() },
  };

  const intelligenceQuery = {
    buildInboxContextForBundle: jest.fn(),
  };

  const service = new ConversationsService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    intelligenceQuery as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  const agent: JwtPayload = {
    sub: "user_agent",
    organizationId: "org_1",
    role: "AGENT",
    email: "agent@test.com",
  };

  const baseConversation = {
    id: "c1",
    organizationId: "org_1",
    assignedToId: "user_agent",
    aiEnabled: false,
    metadata: {},
    contactName: "Test",
    contactPhone: "+919999999999",
    lastInboundAt: new Date(),
    lead: { stage: "NEW", profile: {}, lastClassifiedAt: null, aiConfidence: null },
    assignedTo: null,
    whatsappAccount: { displayPhoneNumber: "+911", isActive: true },
  };

  const inboxContext = { workingMemory: {}, kbHealth: { chunkCount: 0 } };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.message.findMany.mockResolvedValue([]);
    prisma.aiRun.findFirst.mockResolvedValue(null);
    prisma.conversationMemory.findMany.mockResolvedValue([]);
    intelligenceQuery.buildInboxContextForBundle.mockResolvedValue(inboxContext);
  });

  it("returns conversation + inboxContext when authorized (single conversation fetch)", async () => {
    prisma.conversation.findFirst.mockResolvedValue(baseConversation);

    const result = await service.getThreadBundle(agent, "c1");

    expect(result.conversation.id).toBe("c1");
    expect(result.inboxContext).toBe(inboxContext);
    expect(prisma.conversation.findFirst).toHaveBeenCalledTimes(1);
    expect(intelligenceQuery.buildInboxContextForBundle).toHaveBeenCalledWith(
      "org_1",
      baseConversation,
      [],
      [],
    );
  });

  it("throws NotFoundException when conversation missing", async () => {
    prisma.conversation.findFirst.mockResolvedValue(null);

    await expect(service.getThreadBundle(agent, "missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.message.findMany).not.toHaveBeenCalled();
  });

  it("throws ForbiddenException before loading thread when agent lacks access", async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      ...baseConversation,
      assignedToId: "other_user",
    });

    await expect(service.getThreadBundle(agent, "c1")).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.message.findMany).not.toHaveBeenCalled();
  });

  it("loads messages, aiRun, and memories once in parallel", async () => {
    prisma.conversation.findFirst.mockResolvedValue(baseConversation);

    await service.getThreadBundle(agent, "c1");

    expect(prisma.message.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.aiRun.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.conversationMemory.findMany).toHaveBeenCalledTimes(1);
  });
});

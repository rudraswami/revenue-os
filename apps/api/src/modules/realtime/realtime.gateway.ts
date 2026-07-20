import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { JwtPayload } from "@growvisi/shared";
import { Server, Socket } from "socket.io";
import { PrismaService } from "../prisma/prisma.service";
import { EntitlementsService } from "../billing/entitlements.service";
import { JWT_ISSUER, JWT_AUDIENCE } from "../auth/jwt.constants";
import { isAllowedCorsOrigin } from "../../config/cors-origins";
import { RealtimeBroadcastService } from "./realtime-broadcast.service";

export interface MessageNewEvent {
  conversationId: string;
  messageId?: string;
  direction?: "INBOUND" | "OUTBOUND";
  content?: string | null;
  createdAt?: string;
}

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, isAllowedCorsOrigin(origin));
    },
    credentials: true,
  },
  namespace: "/realtime",
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly broadcast: RealtimeBroadcastService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });

      const member = await this.prisma.organizationMember.findFirst({
        where: { organizationId: payload.organizationId, userId: payload.sub },
        include: { user: { select: { status: true } } },
      });
      if (!member || member.user.status !== "ACTIVE") {
        client.disconnect();
        return;
      }

      const access = await this.entitlements.getAccess(payload.organizationId);
      if (!access.hasAccess) {
        this.logger.debug(
          `Client ${client.id} denied — subscription inactive for org:${payload.organizationId}`,
        );
        client.disconnect();
        return;
      }

      client.join(`org:${payload.organizationId}`);
      client.data.organizationId = payload.organizationId;
      this.logger.debug(`Client ${client.id} joined org:${payload.organizationId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected ${client.id}`);
  }

  emitMessageNew(organizationId: string, data: MessageNewEvent) {
    this.server?.to(`org:${organizationId}`).emit("message.new", data);
    void this.broadcast.publish(organizationId, "message.new", data);
  }

  emitInboxUpdated(organizationId: string, conversationId?: string) {
    const payload = { conversationId: conversationId ?? undefined };
    this.server?.to(`org:${organizationId}`).emit("inbox.updated", payload);
    void this.broadcast.publish(organizationId, "inbox.updated", payload);
  }

  emitWhatsappSetupUpdated(
    organizationId: string,
    data: { event: string; wabaId: string; phoneNumberId?: string },
  ) {
    this.server?.to(`org:${organizationId}`).emit("whatsapp.setup.updated", data);
    void this.broadcast.publish(organizationId, "whatsapp.setup.updated", data);
  }

  emitLeadStageChanged(
    organizationId: string,
    data: {
      leadId: string;
      fromStage: string;
      toStage: string;
      confidence?: number;
    },
  ) {
    this.server?.to(`org:${organizationId}`).emit("lead.stage.changed", data);
    void this.broadcast.publish(organizationId, "lead.stage.changed", data);
  }

  emitLeadClassified(
    organizationId: string,
    data: {
      leadId: string;
      conversationId: string;
      stage: string;
      confidence: number;
      stageChanged: boolean;
    },
  ) {
    this.server?.to(`org:${organizationId}`).emit("lead.classified", data);
    void this.broadcast.publish(organizationId, "lead.classified", data);
  }

  emitLeadHandoff(
    organizationId: string,
    data: { conversationId: string; leadId: string; reason: string },
  ) {
    this.server?.to(`org:${organizationId}`).emit("lead.handoff", data);
    void this.broadcast.publish(organizationId, "lead.handoff", data);
  }
}

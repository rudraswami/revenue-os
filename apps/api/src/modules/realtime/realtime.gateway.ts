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

export interface MessageNewEvent {
  conversationId: string;
}

@WebSocketGateway({
  cors: {
    origin: [
      process.env.NEXT_PUBLIC_APP_URL,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ].filter(Boolean) as string[],
    credentials: true,
  },
  namespace: "/realtime",
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
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
  }

  emitInboxUpdated(organizationId: string) {
    this.server?.to(`org:${organizationId}`).emit("inbox.updated", {});
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
  }

  emitLeadHandoff(
    organizationId: string,
    data: { conversationId: string; leadId: string; reason: string },
  ) {
    this.server?.to(`org:${organizationId}`).emit("lead.handoff", data);
  }
}

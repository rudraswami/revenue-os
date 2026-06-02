import { Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    credentials: true,
  },
  namespace: "/realtime",
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const orgId = client.handshake.auth?.organizationId as string | undefined;
    if (!orgId) {
      client.disconnect();
      return;
    }
    client.join(`org:${orgId}`);
    this.logger.debug(`Client joined org:${orgId}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected ${client.id}`);
  }

  emitToOrganization(organizationId: string, event: string, data: unknown) {
    this.server?.to(`org:${organizationId}`).emit(event, data);
  }
}

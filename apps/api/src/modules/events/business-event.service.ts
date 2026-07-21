import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { randomUUID } from "crypto";
import { DOMAIN_EVENTS } from "@growvisi/shared";
import { getRequestId } from "../../common/context/request-context";
import { PrismaService } from "../prisma/prisma.service";

export interface EmitBusinessEventInput {
  organizationId: string;
  type: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
  correlationId?: string;
}

@Injectable()
export class BusinessEventService {
  private readonly logger = new Logger(BusinessEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  createCorrelationId(): string {
    return getRequestId() ?? randomUUID();
  }

  async emit(input: EmitBusinessEventInput) {
    const correlationId = input.correlationId ?? this.createCorrelationId();

    let record: { id: string };
    try {
      record = await this.prisma.businessEvent.create({
        data: {
          organizationId: input.organizationId,
          type: input.type,
          entityType: input.entityType,
          entityId: input.entityId,
          payload: (input.payload ?? {}) as object,
          correlationId,
        },
        select: { id: true },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to persist business event ${input.type}: ${err instanceof Error ? err.message : err}`,
      );
      record = { id: `evt_${randomUUID()}` };
    }

    const envelope = {
      eventId: record.id,
      correlationId,
      organizationId: input.organizationId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload ?? {},
      occurredAt: new Date().toISOString(),
    };

    this.events.emit(input.type, envelope);
    this.events.emit(DOMAIN_EVENTS.AUTOMATION_TRIGGERED, envelope);

    return envelope;
  }
}

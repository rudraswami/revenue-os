import { Controller, Get } from "@nestjs/common";

/** Public landing so Vercel / browser visits to `/` are not a scary 404. */
@Controller()
export class RootController {
  @Get()
  root() {
    return {
      service: "revenue-os-api",
      status: "ok",
      message: "Revenue OS API is running. Use /api/v1/* routes.",
      health: "/api/v1/health",
      auth: "/api/v1/auth/login",
      webhook: "/api/v1/webhooks/whatsapp",
    };
  }
}

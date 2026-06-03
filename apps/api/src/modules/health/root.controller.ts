import { Controller, Get } from "@nestjs/common";
import { GROWTHSYNC_WEB_URL } from "@growthsync/shared";
import { sanitizeEnvValue } from "../../config/cors-origins";

/** Public landing so Vercel / browser visits to `/` are not a scary 404. */
@Controller()
export class RootController {
  @Get()
  root() {
    const webApp = sanitizeEnvValue(process.env.NEXT_PUBLIC_APP_URL)?.replace(/\/$/, "");
    return {
      service: "growthsync-api",
      status: "ok",
      message: webApp
        ? "This is the API server only — open webApp for the GrowthSync website."
        : "API is running. Deploy apps/web on Vercel for the login UI.",
      webApp: webApp ?? GROWTHSYNC_WEB_URL,
      health: "/api/v1/health",
      auth: "/api/v1/auth/login",
      webhook: "/api/v1/webhooks/whatsapp",
    };
  }
}

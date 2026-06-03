import { Controller, Get } from "@nestjs/common";

/** Public landing so Vercel / browser visits to `/` are not a scary 404. */
@Controller()
export class RootController {
  @Get()
  root() {
    const webApp = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    return {
      service: "revenue-os-api",
      status: "ok",
      message: webApp
        ? "This is the API server only — open webApp for the Revenue OS website."
        : "API is running. Deploy apps/web on Vercel for the login UI.",
      webApp: webApp ?? "https://your-web-project.vercel.app",
      health: "/api/v1/health",
      auth: "/api/v1/auth/login",
      webhook: "/api/v1/webhooks/whatsapp",
    };
  }
}

import { INestApplication, RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { IoAdapter } from "@nestjs/platform-socket.io";
import type { Express, Request, Response } from "express";
import express = require("express");
import cookieParser = require("cookie-parser");
import helmet from "helmet";
import { AppModule } from "./app.module";
import { GlobalHttpExceptionFilter } from "./common/filters/http-exception.filter";
import { requestIdMiddleware } from "./common/middleware/request-id.middleware";
import { isAllowedCorsOrigin } from "./config/cors-origins";
import { initSentry } from "./config/sentry";

async function configureApp(app: INestApplication): Promise<void> {
  const httpAdapter = app.getHttpAdapter().getInstance() as {
    set?: (key: string, value: unknown) => void;
  };
  httpAdapter.set?.("trust proxy", 1);

  app.use(requestIdMiddleware);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(cookieParser());

  app.enableCors({
    origin: (origin, callback) => {
      callback(null, isAllowedCorsOrigin(origin));
    },
    credentials: true,
  });
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  if (process.env.VERCEL !== "1") {
    app.useWebSocketAdapter(new IoAdapter(app));
  }

  app.setGlobalPrefix("api/v1", {
    exclude: [{ path: "", method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}

let vercelServerPromise: Promise<Express> | null = null;

async function getVercelServer(): Promise<Express> {
  if (!vercelServerPromise) {
    vercelServerPromise = (async () => {
      try {
        initSentry();
        const expressApp = express();
        const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
          rawBody: true,
        });
        await configureApp(app);
        await app.init();
        return expressApp;
      } catch (err) {
        console.error("[api] Failed to initialize NestJS on Vercel:", err);
        throw err;
      }
    })();
  }
  return vercelServerPromise;
}

async function bootstrap(): Promise<void> {
  initSentry();
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  await configureApp(app);

  const port = process.env.PORT ?? process.env.API_PORT ?? 4000;
  await app.listen(port);
  console.log(`Growvisi API listening on http://localhost:${port}/api/v1`);
}

if (process.env.VERCEL !== "1") {
  bootstrap();
}

export default async function handler(req: Request, res: Response): Promise<void> {
  const server = await getVercelServer();
  server(req, res);
}

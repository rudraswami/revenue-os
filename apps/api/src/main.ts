import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { IoAdapter } from "@nestjs/platform-socket.io";
import cookieParser = require("cookie-parser");
import helmet from "helmet";
import { AppModule } from "./app.module";
import { GlobalHttpExceptionFilter } from "./common/filters/http-exception.filter";
import { isAllowedCorsOrigin } from "./config/cors-origins";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

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

  const port = process.env.PORT ?? process.env.API_PORT ?? 4000;
  await app.listen(port);
  console.log(`Revenue OS API listening on http://localhost:${port}/api/v1`);
}

bootstrap();

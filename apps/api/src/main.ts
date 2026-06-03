import { createApp } from "./bootstrap";

async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT ?? process.env.API_PORT ?? 4000;
  await app.listen(port);
  console.log(`Revenue OS API listening on http://localhost:${port}/api/v1`);
}

bootstrap();

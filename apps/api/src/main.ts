import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api/v1");
  app.use(cookieParser());

  const origins = (config.get<string>("CORS_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length ? origins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (config.get<string>("NODE_ENV") !== "production") {
    const swagger = new DocumentBuilder()
      .setTitle("Vestra API")
      .setVersion("0.0.1")
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, swagger);
    SwaggerModule.setup("api/v1/docs", app, doc);
  }

  const port = Number(config.get("PORT") ?? 3001);
  // Bind to 0.0.0.0 so Fly's internal proxy (IPv6/private net) can reach us.
  // Defaulting to "localhost" silently makes the machine unreachable on Fly.
  await app.listen(port, "0.0.0.0");
  console.log(`[api] listening on 0.0.0.0:${port}/api/v1`);
}

void bootstrap();

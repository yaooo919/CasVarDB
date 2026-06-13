import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module";
import { WorkerRuntimeService } from "./worker-runtime.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  const runtime = app.get(WorkerRuntimeService);
  const logger = new Logger("WorkerBootstrap");

  process.on("SIGTERM", () => {
    logger.log("Received SIGTERM");
    runtime.stop();
  });
  process.on("SIGINT", () => {
    logger.log("Received SIGINT");
    runtime.stop();
  });

  await runtime.runForever();
  await app.close();
}

void bootstrap();

import "reflect-metadata";
import { Context, SQSEvent, SQSHandler } from "aws-lambda";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module";
import { WorkerService } from "./worker.service";

let workerServicePromise: Promise<WorkerService> | undefined;

async function getWorkerService(): Promise<WorkerService> {
  workerServicePromise ??= NestFactory.createApplicationContext(WorkerModule).then((app) => app.get(WorkerService));
  return workerServicePromise;
}

export const handler: SQSHandler = async (event: SQSEvent, _context: Context): Promise<void> => {
  void _context;
  const worker = await getWorkerService();

  for (const record of event.Records) {
    await worker.processMessage(JSON.parse(record.body) as Parameters<WorkerService["processMessage"]>[0]);
  }
};

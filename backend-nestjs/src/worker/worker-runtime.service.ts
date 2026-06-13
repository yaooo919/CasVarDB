import { Injectable, Logger } from "@nestjs/common";
import { AppConfigService } from "../config/config.service";
import { QueueService } from "../queue/queue.service";
import { WorkerService } from "./worker.service";

@Injectable()
export class WorkerRuntimeService {
  private readonly logger = new Logger(WorkerRuntimeService.name);
  private stopping = false;

  constructor(
    private readonly config: AppConfigService,
    private readonly queue: QueueService,
    private readonly worker: WorkerService
  ) {}

  stop(): void {
    this.stopping = true;
  }

  async runForever(): Promise<void> {
    this.logger.log("Worker polling started");

    while (!this.stopping) {
      const messages = await this.queue.receive();

      if (messages.length === 0) {
        await this.sleep(this.config.worker.pollIntervalMs);
        continue;
      }

      for (const message of messages) {
        try {
          await this.worker.processMessage(message.body);
          await this.queue.delete(message.receiptHandle);
        } catch (error) {
          this.logger.error(`Job processing failed: ${(error as Error).message}`, (error as Error).stack);
        }
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { AppConfigService } from "../config/config.service";
import { ReceivedQueueMessage } from "../queue/queue-message";
import { QueueService } from "../queue/queue.service";
import { WorkerService } from "./worker.service";

@Injectable()
export class WorkerRuntimeService {
  private readonly logger = new Logger(WorkerRuntimeService.name);
  private lastIdleLogAt = 0;
  private processedCount = 0;
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
    this.logger.log(
      `Worker polling started; concurrency=${this.config.worker.concurrency} idle heartbeat=${this.config.worker.idleLogIntervalMs}ms statisticsCacheTtl=${this.config.jobs.cacheTtlMs}ms`
    );

    while (!this.stopping) {
      const messages = await this.queue.receive();

      if (messages.length === 0) {
        this.logIdleHeartbeat();
        await this.sleep(this.config.worker.pollIntervalMs);
        continue;
      }

      this.logger.log(`Received ${messages.length} queue message(s)`);
      await Promise.all(messages.map((message) => this.processQueueMessage(message)));
    }
  }

  private async processQueueMessage(message: ReceivedQueueMessage): Promise<void> {
    const { jobId, type } = message.body;

    try {
      this.logger.log(`Processing queue message jobId=${jobId} type=${type}`);
      await this.worker.processMessage(message.body);
      await this.queue.delete(message.receiptHandle);
      this.processedCount += 1;
      this.logger.log(`Completed queue message jobId=${jobId} type=${type}; processed=${this.processedCount}`);
    } catch (error) {
      this.logger.error(
        `Job processing failed jobId=${jobId} type=${type}; message will retry after visibility timeout: ${
          (error as Error).message
        }`,
        (error as Error).stack
      );
    }
  }

  private logIdleHeartbeat(): void {
    const now = Date.now();
    if (now - this.lastIdleLogAt < this.config.worker.idleLogIntervalMs) {
      return;
    }

    this.lastIdleLogAt = now;
    this.logger.log(`Worker alive; queue idle; processed=${this.processedCount}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { DownloadService } from "../download/download.service";
import { JobsService } from "../jobs/jobs.service";
import { QueueJobMessage } from "../queue/queue-message";

@Injectable()
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly downloadService: DownloadService
  ) {}

  async processMessage(message: QueueJobMessage): Promise<void> {
    if (message.type !== "export") {
      const unsupported = message as { type: string };
      throw new Error(`Unsupported job type: ${unsupported.type}`);
    }

    await this.jobsService.markRunning(message.jobId);

    try {
      const csv = await this.downloadService.createCsvForIds(message.payload.selectedIds, message.payload.dataset);
      await this.jobsService.markCompleted(message.jobId, csv);
      this.logger.log(`Completed export job ${message.jobId}`);
    } catch (error) {
      await this.jobsService.markFailed(message.jobId, (error as Error).message);
      throw error;
    }
  }
}

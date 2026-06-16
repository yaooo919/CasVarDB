import { Injectable, Logger } from "@nestjs/common";
import { DownloadService } from "../download/download.service";
import { JobsService } from "../jobs/jobs.service";
import { formatLogPayload } from "../logging/log-payload";
import { QueueJobMessage } from "../queue/queue-message";
import { StatisticsService } from "../statistics/statistics.service";

@Injectable()
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly downloadService: DownloadService,
    private readonly statisticsService: StatisticsService
  ) {}

  async processMessage(message: QueueJobMessage): Promise<void> {
    this.logger.log(
      `Subqueue processor endpoint=${this.getProcessorEndpoint(message)} payload=${formatLogPayload(message)}`
    );

    await this.jobsService.markRunning(message.jobId);

    try {
      switch (message.type) {
        case "export":
          await this.processExportJob(message);
          break;
        case "statistics":
          await this.processStatisticsJob(message);
          break;
        default:
          this.assertNever(message);
      }
    } catch (error) {
      await this.jobsService.markFailed(message.jobId, (error as Error).message);
      throw error;
    }
  }

  private getProcessorEndpoint(message: QueueJobMessage): string {
    if (message.type === "export") {
      return "queue:/jobs/export";
    }

    if (message.type === "statistics") {
      return `queue:/statistics/${message.payload.endpoint}`;
    }

    const unsupported = message as { type: string };
    return `queue:${unsupported.type}`;
  }

  private async processExportJob(message: Extract<QueueJobMessage, { type: "export" }>): Promise<void> {
    const csv = await this.downloadService.createCsvForIds(message.payload.selectedIds, message.payload.dataset);
    await this.jobsService.markCompleted(message.jobId, csv);
    this.logger.log(`Completed export job ${message.jobId}`);
  }

  private async processStatisticsJob(message: Extract<QueueJobMessage, { type: "statistics" }>): Promise<void> {
    const result = await this.statisticsService.runStatisticsJob(message.payload.endpoint, message.payload.query);
    await this.jobsService.markCompleted(message.jobId, JSON.stringify(result));
    this.logger.log(`Completed statistics job ${message.jobId} endpoint=/statistics/${message.payload.endpoint}`);
  }

  private assertNever(value: never): never {
    const unsupported = value as { type?: string };
    throw new Error(`Unsupported job type: ${unsupported.type ?? "unknown"}`);
  }
}

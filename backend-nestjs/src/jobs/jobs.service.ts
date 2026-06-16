import { createHash } from "node:crypto";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AppConfigService } from "../config/config.service";
import { DatabaseService } from "../database/database.service";
import { ExportJobPayload, QueueJobMessage } from "../queue/queue-message";
import { QueueService } from "../queue/queue.service";
import { StatisticsJobPayload, StatisticsJobResult } from "../statistics/statistics.types";
import { ExportJobRequestDto } from "./jobs.dto";
import { BackendJob, CompletedJobResult, JobCreateResponse, JobPayload, JobResponse, JobType } from "./jobs.types";

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly database: DatabaseService,
    private readonly queue: QueueService
  ) {}

  async createExportJob(request: ExportJobRequestDto, clientIp: string): Promise<JobCreateResponse> {
    const payload: ExportJobPayload = {
      selectedIds: [...new Set(request.selectedIds)],
      dataset: request.dataset ?? "cas9"
    };

    return this.createOrReuseQueuedJob("export", payload, clientIp);
  }

  async createStatisticsJob(
    payload: StatisticsJobPayload,
    clientIp: string
  ): Promise<JobCreateResponse | StatisticsJobResult> {
    const cached = await this.findCachedStatisticsJob(payload, clientIp);
    if (cached?.result) {
      if (cached.status === "completed" && this.isFreshCompletedJob(cached)) {
        this.logger.log(`Cache hit for statistics job id=${cached.id} endpoint=${payload.endpoint}`);
        return JSON.parse(cached.result) as StatisticsJobResult;
      }

      if (cached.status === "completed" || cached.status === "failed") {
        await this.refreshStatisticsJob(cached.id, payload);
      } else {
        this.logger.log(`Returning stale statistics result while refresh is ${cached.status} id=${cached.id}`);
      }

      return JSON.parse(cached.result) as StatisticsJobResult;
    }

    return this.createOrReuseQueuedJob("statistics", payload, clientIp);
  }

  async getJob(id: string): Promise<JobResponse> {
    const job = await this.findJob(id);
    return this.toJobResponse(job);
  }

  async getCompletedResult(id: string): Promise<CompletedJobResult> {
    const job = await this.findJob(id);
    if (!job.result || (job.type !== "statistics" && job.status !== "completed")) {
      throw new NotFoundException("Job result is not available");
    }

    return { type: job.type, result: job.result };
  }

  async markRunning(id: string): Promise<void> {
    await this.database.execute("UPDATE backend_jobs SET status = 'running', error = NULL WHERE id = ?", [id]);
  }

  async markCompleted(id: string, result: string): Promise<void> {
    await this.database.execute(
      "UPDATE backend_jobs SET status = 'completed', result = ?, error = NULL, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
      [result, id]
    );
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.database.execute(
      "UPDATE backend_jobs SET status = 'failed', error = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
      [error, id]
    );
  }

  private async createOrReuseQueuedJob(
    type: "export",
    payload: ExportJobPayload,
    clientIp: string
  ): Promise<JobCreateResponse>;

  private async createOrReuseQueuedJob(
    type: "statistics",
    payload: StatisticsJobPayload,
    clientIp: string
  ): Promise<JobCreateResponse>;

  private async createOrReuseQueuedJob(
    type: JobType,
    payload: JobPayload,
    clientIp: string
  ): Promise<JobCreateResponse> {
    const id = this.createStableJobId(type, payload, clientIp);
    const message = this.createQueueMessage(id, type, payload);

    try {
      await this.insertQueuedJob(id, type, payload);
      await this.queue.send(message);
      this.logger.log(`Queued job id=${id} type=${type}`);
      return { id, status: "queued" };
    } catch (error) {
      if (!this.isDuplicateJobError(error)) {
        throw error;
      }

      return this.reuseExistingJob(id, type, payload, message);
    }
  }

  private async findCachedStatisticsJob(
    payload: StatisticsJobPayload,
    clientIp: string
  ): Promise<BackendJob | undefined> {
    const id = this.createStableJobId("statistics", payload, clientIp);
    return this.findJobOrUndefined(id);
  }

  private async reuseExistingJob(
    id: string,
    type: JobType,
    payload: JobPayload,
    message: QueueJobMessage
  ): Promise<JobCreateResponse> {
    const existing = await this.findJob(id);

    if (existing.status === "completed" && !this.isFreshCompletedJob(existing)) {
      await this.resetQueuedJob(id, type, payload, type !== "statistics");
      await this.queue.send(message);
      this.logger.log(`Requeued expired cached job id=${id} type=${type}`);
      return { id, status: "queued" };
    }

    if (existing.status === "failed") {
      await this.resetQueuedJob(id, type, payload, type !== "statistics");
      await this.queue.send(message);
      this.logger.log(`Requeued failed cached job id=${id} type=${type}`);
      return { id, status: "queued" };
    }

    this.logger.log(`Reusing cached job id=${id} type=${type} status=${existing.status}`);
    return { id, status: existing.status };
  }

  private async insertQueuedJob(id: string, type: JobType, payload: JobPayload): Promise<void> {
    await this.database.execute(
      "INSERT INTO backend_jobs (id, type, status, payload) VALUES (?, ?, 'queued', CAST(? AS JSON))",
      [id, type, JSON.stringify(payload)]
    );
  }

  private async resetQueuedJob(
    id: string,
    type: JobType,
    payload: JobPayload,
    clearResult: boolean
  ): Promise<void> {
    const resultClause = clearResult ? "result = NULL," : "";

    await this.database.execute(
      `UPDATE backend_jobs
       SET type = ?, status = 'queued', payload = CAST(? AS JSON), ${resultClause} error = NULL, completed_at = NULL
       WHERE id = ?`,
      [type, JSON.stringify(payload), id]
    );
  }

  private async refreshStatisticsJob(id: string, payload: StatisticsJobPayload): Promise<void> {
    const result = await this.database.execute(
      `UPDATE backend_jobs
       SET status = 'queued', payload = CAST(? AS JSON), error = NULL
       WHERE id = ? AND status IN ('completed', 'failed')`,
      [JSON.stringify(payload), id]
    );

    if (result.affectedRows === 0) {
      return;
    }

    await this.queue.send(this.createQueueMessage(id, "statistics", payload));
    this.logger.log(`Refreshing expired statistics job id=${id} endpoint=${payload.endpoint}`);
  }

  private async findJob(id: string): Promise<BackendJob> {
    const rows = await this.database.query<BackendJob[]>("SELECT * FROM backend_jobs WHERE id = ?", [id]);
    const job = rows[0];
    if (!job) {
      throw new NotFoundException("Job not found");
    }

    return job;
  }

  private async findJobOrUndefined(id: string): Promise<BackendJob | undefined> {
    const rows = await this.database.query<BackendJob[]>("SELECT * FROM backend_jobs WHERE id = ?", [id]);
    return rows[0];
  }

  private toJobResponse(job: BackendJob): JobResponse {
    return {
      id: job.id,
      type: job.type,
      status: job.type === "statistics" && job.result ? "completed" : job.status,
      payload: typeof job.payload === "string" ? (JSON.parse(job.payload) as JobPayload) : job.payload,
      error: job.error,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      completedAt: job.completed_at
    };
  }

  private createQueueMessage(id: string, type: JobType, payload: JobPayload): QueueJobMessage {
    if (type === "export") {
      return {
        jobId: id,
        type,
        payload: payload as ExportJobPayload
      };
    }

    return {
      jobId: id,
      type,
      payload: payload as StatisticsJobPayload
    };
  }

  private createStableJobId(type: JobType, payload: JobPayload, clientIp: string): string {
    const hash = createHash("sha256")
      .update(JSON.stringify(this.normalizeForHash({ clientIp, payload, type })))
      .digest("hex")
      .slice(0, 32);

    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`;
  }

  private normalizeForHash(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeForHash(item));
    }

    if (value && typeof value === "object") {
      return Object.keys(value)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          const entry = (value as Record<string, unknown>)[key];
          if (entry !== undefined) {
            acc[key] = this.normalizeForHash(entry);
          }

          return acc;
        }, {});
    }

    return value;
  }

  private isDuplicateJobError(error: unknown): boolean {
    const mysqlError = error as { code?: string; errno?: number };
    return mysqlError.code === "ER_DUP_ENTRY" || mysqlError.errno === 1062;
  }

  private isFreshCompletedJob(job: BackendJob): boolean {
    if (this.config.jobs.cacheTtlMs <= 0) {
      return true;
    }

    if (!job.completed_at) {
      return false;
    }

    const completedAt = job.completed_at instanceof Date ? job.completed_at.getTime() : new Date(job.completed_at).getTime();
    return Number.isFinite(completedAt) && Date.now() - completedAt <= this.config.jobs.cacheTtlMs;
  }
}

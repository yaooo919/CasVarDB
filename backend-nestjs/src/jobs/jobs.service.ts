import { randomUUID } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { ExportJobPayload, QueueJobMessage } from "../queue/queue-message";
import { QueueService } from "../queue/queue.service";
import { ExportJobRequestDto } from "./jobs.dto";
import { BackendJob, JobResponse } from "./jobs.types";

@Injectable()
export class JobsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly queue: QueueService
  ) {}

  async createExportJob(request: ExportJobRequestDto): Promise<{ id: string; status: "queued" }> {
    const id = randomUUID();
    const payload: ExportJobPayload = {
      selectedIds: [...new Set(request.selectedIds)],
      dataset: request.dataset ?? "cas9"
    };
    const message: QueueJobMessage = {
      jobId: id,
      type: "export",
      payload
    };

    await this.database.execute(
      "INSERT INTO backend_jobs (id, type, status, payload) VALUES (?, ?, 'queued', CAST(? AS JSON))",
      [id, "export", JSON.stringify(payload)]
    );
    await this.queue.send(message);

    return { id, status: "queued" };
  }

  async getJob(id: string): Promise<JobResponse> {
    const job = await this.findJob(id);
    return this.toJobResponse(job);
  }

  async getCompletedResult(id: string): Promise<string> {
    const job = await this.findJob(id);
    if (job.status !== "completed" || !job.result) {
      throw new NotFoundException("Job result is not available");
    }

    return job.result;
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

  private async findJob(id: string): Promise<BackendJob> {
    const rows = await this.database.query<BackendJob[]>("SELECT * FROM backend_jobs WHERE id = ?", [id]);
    const job = rows[0];
    if (!job) {
      throw new NotFoundException("Job not found");
    }

    return job;
  }

  private toJobResponse(job: BackendJob): JobResponse {
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      payload: typeof job.payload === "string" ? (JSON.parse(job.payload) as ExportJobPayload) : job.payload,
      error: job.error,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      completedAt: job.completed_at
    };
  }
}

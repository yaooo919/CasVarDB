import { RowDataPacket } from "mysql2/promise";
import { ExportJobPayload, QueueJobMessage } from "../queue/queue-message";
import { StatisticsJobPayload } from "../statistics/statistics.types";

export type JobStatus = "queued" | "running" | "completed" | "failed";
export type JobType = QueueJobMessage["type"];
export type JobPayload = ExportJobPayload | StatisticsJobPayload;

export interface BackendJob extends RowDataPacket {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: string | JobPayload;
  result: string | null;
  error: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export interface JobResponse {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: JobPayload;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface JobCreateResponse {
  id: string;
  status: JobStatus;
}

export interface CompletedJobResult {
  type: JobType;
  result: string;
}

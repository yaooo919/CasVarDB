import { RowDataPacket } from "mysql2/promise";
import { ExportJobPayload } from "../queue/queue-message";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface BackendJob extends RowDataPacket {
  id: string;
  type: "export";
  status: JobStatus;
  payload: string | ExportJobPayload;
  result: string | null;
  error: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export interface JobResponse {
  id: string;
  type: "export";
  status: JobStatus;
  payload: ExportJobPayload;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

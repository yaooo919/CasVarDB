import { Dataset } from "../data/data.types";
import { StatisticsJobPayload } from "../statistics/statistics.types";

export interface ExportJobPayload {
  selectedIds: number[];
  dataset: Dataset;
}

export interface ExportQueueJobMessage {
  jobId: string;
  type: "export";
  payload: ExportJobPayload;
}

export interface StatisticsQueueJobMessage {
  jobId: string;
  type: "statistics";
  payload: StatisticsJobPayload;
}

export type QueueJobMessage = ExportQueueJobMessage | StatisticsQueueJobMessage;

export interface ReceivedQueueMessage {
  body: QueueJobMessage;
  receiptHandle: string;
}

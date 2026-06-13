import { Dataset } from "../data/data.types";

export interface ExportJobPayload {
  selectedIds: number[];
  dataset: Dataset;
}

export interface QueueJobMessage {
  jobId: string;
  type: "export";
  payload: ExportJobPayload;
}

export interface ReceivedQueueMessage {
  body: QueueJobMessage;
  receiptHandle: string;
}

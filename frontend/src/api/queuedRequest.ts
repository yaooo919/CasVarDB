import axios, { AxiosRequestConfig } from "axios";

type QueuedResponse = {
  id: string;
  status: JobStatusResponse["status"];
};

type JobStatusResponse = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  error: string | null;
};

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 600000;

export async function getQueuedResult<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await axios.get(url, config);

  if (!isQueuedResponse(response.data)) {
    return response.data as T;
  }

  return pollJobResult<T>(url, response.data.id);
}

async function pollJobResult<T>(requestUrl: string, jobId: string): Promise<T> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const jobResponse = await axios.get<JobStatusResponse>(buildJobUrl(requestUrl, `/jobs/${jobId}`));

    if (jobResponse.data.status === "completed") {
      const resultResponse = await axios.get<T>(buildJobUrl(requestUrl, `/jobs/${jobId}/result`));
      return resultResponse.data;
    }

    if (jobResponse.data.status === "failed") {
      throw new Error(jobResponse.data.error || `Queued job ${jobId} failed`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Queued job ${jobId} timed out`);
}

function isQueuedResponse(value: unknown): value is QueuedResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "status" in value &&
    typeof (value as QueuedResponse).id === "string" &&
    isJobStatus((value as QueuedResponse).status)
  );
}

function isJobStatus(value: unknown): value is JobStatusResponse["status"] {
  return value === "queued" || value === "running" || value === "completed" || value === "failed";
}

function buildJobUrl(requestUrl: string, path: string): string {
  return new URL(path, requestUrl).toString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

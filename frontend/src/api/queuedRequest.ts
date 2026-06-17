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

export type QueuedRequestStatusUpdate = {
  id: string;
  status: JobStatusResponse["status"];
};

type QueuedRequestOptions = {
  onStatusChange?: (update: QueuedRequestStatusUpdate) => void;
};

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 600000;

export async function getQueuedResult<T>(
  url: string,
  config?: AxiosRequestConfig,
  options: QueuedRequestOptions = {}
): Promise<T> {
  const response = await axios.get(url, config);

  if (!isQueuedResponse(response.data)) {
    return response.data as T;
  }

  options.onStatusChange?.({ id: response.data.id, status: response.data.status });

  try {
    return await pollJobResult<T>(url, response.data.id, options);
  } catch (error) {
    options.onStatusChange?.({ id: response.data.id, status: "failed" });
    throw error;
  }
}

async function pollJobResult<T>(
  requestUrl: string,
  jobId: string,
  options: QueuedRequestOptions
): Promise<T> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const jobResponse = await axios.get<JobStatusResponse>(buildJobUrl(requestUrl, `/jobs/${jobId}`));
    options.onStatusChange?.({ id: jobResponse.data.id || jobId, status: jobResponse.data.status });

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

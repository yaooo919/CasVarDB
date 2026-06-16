export type SummaryStats = {
  min: number;
  max: number;
  mean: number;
  median: number;
  q1: number;
  q3: number;
};

export type SummaryStatsResponse = Record<string, SummaryStats>;
export type CountPerStudyResponse = Record<string, number>;
export type FrequencyPerMismatchResponse = Record<string, number>;
export type FrequencyMismatchPerVariantResponse = Array<Record<string, number | string>>;
export type HeatmapResponse = Record<string, Record<string, { raw: number; normalized: number }>>;
export type ActivityGraphResponse = Record<string, number | number[]>;

export type ActivityGraphQuery = {
  pam: string;
  numberOfMismatches: string;
  variant: string;
  mismatchPosition?: string;
  countOnly: boolean;
};

export type StatisticsJobEndpoint =
  | "cas9-freq-per-variant"
  | "cas12-freq-per-variant"
  | "freq-per-scaffold"
  | "data-count-per-study"
  | "cas9-freq-per-mismatch"
  | "cas12-freq-per-mismatch"
  | "freq-mismatch-per-variant"
  | "heatmap-data"
  | "activity-graph";

export type StatisticsJobPayload = {
  endpoint: StatisticsJobEndpoint;
  query?: ActivityGraphQuery;
};

export type StatisticsJobResult =
  | SummaryStatsResponse
  | CountPerStudyResponse
  | FrequencyPerMismatchResponse
  | FrequencyMismatchPerVariantResponse
  | HeatmapResponse
  | ActivityGraphResponse;

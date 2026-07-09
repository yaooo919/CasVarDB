export type Dataset = "cas9" | "cas12";
export interface DataQuery {
  page?: string;
  pageSize?: string;
  searchField?: string;
  searchTerm?: string;
  sortField?: string;
  sortDirection?: string;
}

export interface DataListResult {
  data: Record<string, unknown>[];
  count: number;
}

export interface DataCompatResult extends DataListResult {
  rows: Record<string, unknown>[];
  total: number;
}


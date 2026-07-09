import { BadRequestException, Injectable } from "@nestjs/common";
import { RowDataPacket } from "mysql2/promise";
import { DatabaseService, SqlParam } from "../database/database.service";
import { sqlIdentifier } from "../database/mysql-identifiers";
import { DataCompatResult, DataQuery, Dataset } from "./data.types";

const cas9SearchFields = [
  "id",
  "spacer_sequence_raw",
  "target_context_sequence_raw",
  "spacer_sequence",
  "target_context_sequence",
  "variant",
  "nuclease",
  "gRNA_scaffold",
  "day",
  "tRNA_feature",
  "study",
  "number_of_mismatches"
] as const;

const cas12SearchFields = [
  "id",
  "spacer_sequence_raw",
  "target_context_sequence_raw",
  "spacer_sequence",
  "target_context_sequence",
  "variant",
  "nuclease",
  "gRNA_scaffold",
  "day",
  "cas12a_transfection",
  "study",
  "number_of_mismatches"
] as const;

const commonSortFields = [
  "id",
  "spacer_sequence_raw",
  "target_context_sequence_raw",
  "spacer_sequence",
  "target_context_sequence",
  "variant",
  "nuclease",
  "gRNA_scaffold",
  "day",
  "study",
  "library",
  "table_number",
  "sheet_number",
  "src_idx",
  "n_data",
  "partition",
  "barcode",
  "background_subtracted_indel_frequencies",
  "mean_background_subtracted_indel_frequency_source",
  "mean_background_subtracted_indel_frequency",
  "number_of_mismatches",
  "mismatch_positions"
] as const;

const tableConfig: Record<Dataset, { table: Dataset; searchFields: readonly string[]; sortFields: readonly string[] }> = {
  cas9: {
    table: "cas9",
    searchFields: cas9SearchFields,
    sortFields: [...commonSortFields, "tRNA_feature", "spacer_index"]
  },
  cas12: {
    table: "cas12",
    searchFields: cas12SearchFields,
    sortFields: [...commonSortFields, "cas12a_transfection"]
  }
};

interface CountRow extends RowDataPacket {
  total: number;
}

@Injectable()
export class DataService {
  constructor(private readonly database: DatabaseService) {}

  async list(dataset: Dataset, query: DataQuery): Promise<DataCompatResult> {
    const config = tableConfig[dataset];
    const page = this.positiveInt(query.page, 1, "page");
    const pageSize = this.positiveInt(query.pageSize, 50, "pageSize");
    const searchTerm = query.searchTerm?.trim() ?? "";
    const searchField = query.searchField?.trim() || "id";
    const sortField = query.sortField?.trim() || "id";
    const sortDirection = this.sortDirection(query.sortDirection);

    if (!config.searchFields.includes(searchField)) {
      throw new BadRequestException("Invalid search field");
    }

    if (!config.sortFields.includes(sortField)) {
      throw new BadRequestException("Invalid sort field");
    }

    const where = this.buildWhereClause(searchField, searchTerm);
    const table = sqlIdentifier(config.table);
    const countRows = await this.database.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM ${table}${where.sql}`,
      where.params
    );

    const offset = (page - 1) * pageSize;
    const rows = await this.database.query<RowDataPacket[]>(
      `SELECT * FROM ${table}${where.sql} ORDER BY ${sqlIdentifier(sortField)} ${sortDirection} LIMIT ? OFFSET ?`,
      [...where.params, pageSize, offset]
    );

    const total = Number(countRows[0]?.total ?? 0);
    const records = rows.map((row) => ({ ...row }));

    return {
      rows: records,
      total,
      data: records,
      count: total
    };
  }

  private positiveInt(value: string | undefined, fallback: number, name: string): number {
    if (!value) {
      return fallback;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(`${name} must be a positive integer`);
    }

    return parsed;
  }

  private sortDirection(value: string | undefined): "ASC" | "DESC" {
    const normalized = value?.toUpperCase() ?? "ASC";
    if (normalized !== "ASC" && normalized !== "DESC") {
      throw new BadRequestException("Invalid sort direction");
    }

    return normalized;
  }

  private buildWhereClause(searchField: string, searchTerm: string): { sql: string; params: SqlParam[] } {
    if (!searchTerm) {
      return { sql: "", params: [] };
    }

    if (searchField === "id") {
      const id = Number(searchTerm);
      if (!Number.isInteger(id)) {
        throw new BadRequestException("id search must be an integer");
      }

      return {
        sql: ` WHERE ${sqlIdentifier(searchField)} = ?`,
        params: [id]
      };
    }

    return {
      sql: ` WHERE ${sqlIdentifier(searchField)} LIKE ?`,
      params: [`%${searchTerm}%`]
    };
  }
}

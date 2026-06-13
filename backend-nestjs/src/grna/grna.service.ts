import { BadRequestException, Injectable } from "@nestjs/common";
import { RowDataPacket } from "mysql2/promise";
import { DatabaseService } from "../database/database.service";
import { sqlIdentifier } from "../database/mysql-identifiers";

const grnaSortFields = [
  "id",
  "gRNA_scaffold",
  "gRNA_scaffold_sequence",
  "polyT_length",
  "gRNA_scaffold_sequence_length"
] as const;

export interface GrnaQuery {
  sortField?: string;
  sortDirection?: string;
}

@Injectable()
export class GrnaService {
  constructor(private readonly database: DatabaseService) {}

  async list(query: GrnaQuery): Promise<Record<string, unknown>[]> {
    const sortField = query.sortField?.trim() || "id";
    const sortDirection = this.sortDirection(query.sortDirection);

    if (!grnaSortFields.includes(sortField as (typeof grnaSortFields)[number])) {
      throw new BadRequestException("Invalid sort field");
    }

    const rows = await this.database.query<RowDataPacket[]>(
      `SELECT * FROM grna_scaffold ORDER BY ${sqlIdentifier(sortField)} ${sortDirection}`
    );
    return rows.map((row) => ({ ...row }));
  }

  private sortDirection(value: string | undefined): "ASC" | "DESC" {
    const normalized = value?.toUpperCase() ?? "ASC";
    if (normalized !== "ASC" && normalized !== "DESC") {
      throw new BadRequestException("Invalid sort direction");
    }

    return normalized;
  }
}

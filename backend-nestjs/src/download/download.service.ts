import { Injectable, NotFoundException } from "@nestjs/common";
import { RowDataPacket } from "mysql2/promise";
import { Dataset } from "../data/data.types";
import { DatabaseService } from "../database/database.service";
import { sqlIdentifier } from "../database/mysql-identifiers";
import { rowsToCsv } from "./csv";

@Injectable()
export class DownloadService {
  constructor(private readonly database: DatabaseService) {}

  async createCsvForIds(selectedIds: number[], dataset: Dataset = "cas9"): Promise<string> {
    const uniqueIds = [...new Set(selectedIds)];
    const placeholders = uniqueIds.map(() => "?").join(",");
    const rows = await this.database.query<RowDataPacket[]>(
      `SELECT * FROM ${sqlIdentifier(dataset)} WHERE id IN (${placeholders}) ORDER BY id ASC`,
      uniqueIds
    );

    if (rows.length === 0) {
      throw new NotFoundException("No data found for the provided IDs");
    }

    return rowsToCsv(rows.map((row) => ({ ...row })));
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import mysql, { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { AppConfigService } from "../config/config.service";

export type SqlParam = string | number | boolean | Date | Buffer | null;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor(private readonly config: AppConfigService) {}

  async onModuleInit(): Promise<void> {
    this.pool = mysql.createPool({
      host: this.config.db.host,
      port: this.config.db.port,
      user: this.config.db.user,
      password: this.config.db.password,
      database: this.config.db.database,
      waitForConnections: true,
      connectionLimit: this.config.db.connectionLimit,
      namedPlaceholders: false,
      charset: "utf8mb4"
    });

    await this.ensureBackendJobsTable();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async query<T extends RowDataPacket[]>(sql: string, params: readonly SqlParam[] = []): Promise<T> {
    const [rows] = await this.pool.query<T>(sql, [...params]);
    return rows;
  }

  async execute(sql: string, params: readonly SqlParam[] = []): Promise<ResultSetHeader> {
    const [result] = await this.pool.execute<ResultSetHeader>(sql, [...params]);
    return result;
  }

  private async ensureBackendJobsTable(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS backend_jobs (
        id varchar(36) NOT NULL,
        type varchar(64) NOT NULL,
        status enum('queued','running','completed','failed') NOT NULL DEFAULT 'queued',
        payload json NOT NULL,
        result longtext,
        error text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at timestamp NULL DEFAULT NULL,
        PRIMARY KEY (id),
        KEY idx_backend_jobs_status (status),
        KEY idx_backend_jobs_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }
}

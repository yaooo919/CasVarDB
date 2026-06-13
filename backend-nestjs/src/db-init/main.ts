import "dotenv/config";
import { execFileSync } from "node:child_process";
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import { open } from "node:fs/promises";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ReadableStream } from "node:stream/web";
import { parse } from "csv-parse";
import { escapeId } from "mysql2";
import mysql, { Connection } from "mysql2/promise";

type CsvRow = Record<string, string | undefined>;
type SqlValue = string | number | null;

interface DatasetConfig {
  readonly label: string;
  readonly fileName: string;
  readonly googleDriveFileId: string;
  readonly tableName: string;
  readonly dbColumns: readonly string[];
  readonly toValues: (row: CsvRow) => SqlValue[];
}

const batchSize = numberEnv("DB_INIT_BATCH_SIZE") ?? 500;
const dataDir = process.env.DATA_DIR ?? join(process.cwd(), "data");
const dbHost = process.env.DB_HOST ?? "127.0.0.1";
const dbPort = resolveDbPort();
const dbConnectRetries = numberEnv("DB_CONNECT_RETRIES") ?? 30;
const dbConnectRetryMs = numberEnv("DB_CONNECT_RETRY_MS") ?? 2000;

const createCas9Sql = `
CREATE TABLE IF NOT EXISTS ${escapeId("cas9")} (
  ${escapeId("id")} int NOT NULL,
  ${escapeId("spacer_sequence_raw")} text,
  ${escapeId("target_context_sequence_raw")} text,
  ${escapeId("spacer_sequence")} text,
  ${escapeId("target_context_sequence")} text,
  ${escapeId("variant")} varchar(255) DEFAULT NULL,
  ${escapeId("nuclease")} varchar(255) DEFAULT NULL,
  ${escapeId("gRNA_scaffold")} varchar(255) DEFAULT NULL,
  ${escapeId("day")} varchar(255) DEFAULT NULL,
  ${escapeId("tRNA_feature")} enum('TRUE','FALSE') DEFAULT NULL,
  ${escapeId("study")} text,
  ${escapeId("library")} text,
  ${escapeId("table_number")} text,
  ${escapeId("sheet_number")} text,
  ${escapeId("src_idx")} text,
  ${escapeId("n_data")} int DEFAULT NULL,
  ${escapeId("partition")} varchar(255) DEFAULT NULL,
  ${escapeId("barcode")} text,
  ${escapeId("background_subtracted_indel_frequencies")} text,
  ${escapeId("mean_background_subtracted_indel_frequency_source")} text,
  ${escapeId("mean_background_subtracted_indel_frequency")} double DEFAULT NULL,
  ${escapeId("spacer_index")} int DEFAULT NULL,
  ${escapeId("number_of_mismatches")} int DEFAULT NULL,
  ${escapeId("mismatch_positions")} text,
  PRIMARY KEY (${escapeId("id")})
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
`;

const createCas12Sql = `
CREATE TABLE IF NOT EXISTS ${escapeId("cas12")} (
  ${escapeId("id")} int NOT NULL,
  ${escapeId("spacer_sequence_raw")} text,
  ${escapeId("target_context_sequence_raw")} text,
  ${escapeId("spacer_sequence")} text,
  ${escapeId("target_context_sequence")} text,
  ${escapeId("variant")} varchar(255) DEFAULT NULL,
  ${escapeId("nuclease")} varchar(255) DEFAULT NULL,
  ${escapeId("gRNA_scaffold")} varchar(255) DEFAULT NULL,
  ${escapeId("day")} varchar(255) DEFAULT NULL,
  ${escapeId("cas12a_transfection")} varchar(255) DEFAULT NULL,
  ${escapeId("study")} text,
  ${escapeId("library")} text,
  ${escapeId("table_number")} text,
  ${escapeId("sheet_number")} text,
  ${escapeId("src_idx")} text,
  ${escapeId("n_data")} int DEFAULT NULL,
  ${escapeId("partition")} varchar(255) DEFAULT NULL,
  ${escapeId("barcode")} text,
  ${escapeId("background_subtracted_indel_frequencies")} text,
  ${escapeId("mean_background_subtracted_indel_frequency_source")} text,
  ${escapeId("mean_background_subtracted_indel_frequency")} double DEFAULT NULL,
  ${escapeId("number_of_mismatches")} int DEFAULT NULL,
  ${escapeId("mismatch_positions")} text,
  PRIMARY KEY (${escapeId("id")})
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
`;

const createGrnaSql = `
CREATE TABLE IF NOT EXISTS ${escapeId("grna_scaffold")} (
  ${escapeId("id")} int NOT NULL AUTO_INCREMENT,
  ${escapeId("gRNA_scaffold")} varchar(25) DEFAULT NULL,
  ${escapeId("gRNA_scaffold_sequence")} text,
  ${escapeId("polyT_length")} int DEFAULT NULL,
  ${escapeId("gRNA_scaffold_sequence_length")} int DEFAULT NULL,
  PRIMARY KEY (${escapeId("id")})
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
`;

const createBackendJobsSql = `
CREATE TABLE IF NOT EXISTS ${escapeId("backend_jobs")} (
  ${escapeId("id")} varchar(36) NOT NULL,
  ${escapeId("type")} varchar(64) NOT NULL,
  ${escapeId("status")} enum('queued','running','completed','failed') NOT NULL DEFAULT 'queued',
  ${escapeId("payload")} json NOT NULL,
  ${escapeId("result")} longtext,
  ${escapeId("error")} text,
  ${escapeId("created_at")} timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ${escapeId("updated_at")} timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ${escapeId("completed_at")} timestamp NULL DEFAULT NULL,
  PRIMARY KEY (${escapeId("id")}),
  KEY ${escapeId("idx_backend_jobs_status")} (${escapeId("status")}),
  KEY ${escapeId("idx_backend_jobs_created_at")} (${escapeId("created_at")})
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
`;

const cas9Columns = [
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
  "spacer_index",
  "number_of_mismatches",
  "mismatch_positions"
] as const;

const cas12Columns = [
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

const grnaColumns = [
  "gRNA_scaffold",
  "gRNA_scaffold_sequence",
  "polyT_length",
  "gRNA_scaffold_sequence_length"
] as const;

const datasets: DatasetConfig[] = [
  {
    label: "Cas9",
    fileName: "Cas9.csv",
    googleDriveFileId: "1cp_gGih_2AV6HyYdINjH0fveo-0xbaVz",
    tableName: "cas9",
    dbColumns: cas9Columns,
    toValues: (row) => [
      numberValue(row["ID"]),
      sqlValue(row["Spacer sequence (raw)"]),
      sqlValue(row["Target context sequence (raw)"]),
      sqlValue(row["Spacer sequence"]),
      sqlValue(row["Target context sequence"]),
      sqlValue(row["Variant"]),
      sqlValue(row["Nuclease"]),
      sqlValue(row["gRNA scaffold"]),
      sqlValue(row["Day"]),
      normalizeTrnaFeature(row["tRNA feature"]),
      sqlValue(row["Study"]),
      sqlValue(row["Library"]),
      sqlValue(row["Table"]),
      sqlValue(row["Sheet"]),
      sqlValue(row["src_idx"]),
      numberValue(row["n_data"]),
      sqlValue(row["Partition"]),
      sqlValue(row["Barcode"]),
      sqlValue(row["Background subtracted indel frequencies (%)"]),
      sqlValue(row["Mean background subtracted indel frequency (source, %)"]),
      numberValue(row["Mean background subtracted indel frequency (%)"]),
      numberValue(row["Spacer index"]),
      numberValue(row["Number of mismatches"]),
      sqlValue(row["Mismatch positions"])
    ]
  },
  {
    label: "Cas12",
    fileName: "Cas12.csv",
    googleDriveFileId: "1U6w07YwiZIIShxbZvWkoXw3J_pIrDocj",
    tableName: "cas12",
    dbColumns: cas12Columns,
    toValues: (row) => [
      numberValue(row["ID"]),
      sqlValue(row["Spacer sequence (raw)"]),
      sqlValue(row["Target context sequence (raw)"]),
      sqlValue(row["Spacer sequence"]),
      sqlValue(row["Target context sequence"]),
      sqlValue(row["Variant"]),
      sqlValue(row["Nuclease"]),
      sqlValue(row["gRNA scaffold"]),
      sqlValue(row["Day"]),
      sqlValue(row["Cas12a transfection"]),
      sqlValue(row["Study"]),
      sqlValue(row["Library"]),
      sqlValue(row["Table"]),
      sqlValue(row["Sheet"]),
      sqlValue(row["src_idx"]),
      numberValue(row["n_data"]),
      sqlValue(row["Partition"]),
      sqlValue(row["Barcode"]),
      sqlValue(row["Background subtracted indel frequencies (%)"]),
      sqlValue(row["Mean background subtracted indel frequency (source, %)"]),
      numberValue(row["Mean background subtracted indel frequency (%)"]),
      numberValue(row["Number of mismatches"]),
      sqlValue(row["Mismatch positions"])
    ]
  },
  {
    label: "gRNA scaffolds",
    fileName: "gRNA_scaffolds.csv",
    googleDriveFileId: "1sDnQQZzjtbWC_LhaqimjMkOQ6WxyoLZz",
    tableName: "grna_scaffold",
    dbColumns: grnaColumns,
    toValues: (row) => [
      sqlValue(row["gRNA scaffold"]),
      sqlValue(row["gRNA scaffold sequence"]),
      numberValue(row["polyT length"]),
      numberValue(row["gRNA scaffold sequence length"])
    ]
  }
];

async function main(): Promise<void> {
  mkdirSync(dataDir, { recursive: true });
  const databaseName = process.env.DB_NAME ?? "casvardb";

  const bootstrapConnection = await createConnection();
  await bootstrapConnection.execute(`CREATE DATABASE IF NOT EXISTS ${escapeId(databaseName)}`);
  await bootstrapConnection.end();

  const connection = await createConnection(databaseName);
  try {
    await createTables(connection);

    for (const dataset of datasets) {
      if (await shouldSkipImport(connection, dataset)) {
        console.log(`${dataset.label} already has data; skipping import`);
        continue;
      }

      const filePath = join(dataDir, dataset.fileName);
      await downloadFromGoogleDrive(dataset.googleDriveFileId, filePath);
      await importCsv(connection, dataset, filePath);
    }
  } finally {
    await connection.end();
  }
}

async function createConnection(database?: string): Promise<Connection> {
  for (let attempt = 1; attempt <= dbConnectRetries; attempt += 1) {
    try {
      return await mysql.createConnection({
        host: dbHost,
        port: dbPort,
        user: process.env.DB_USER ?? "collab_casvardb",
        password: process.env.DB_PASSWORD ?? "Cv2y*%",
        database,
        charset: "utf8mb4",
        connectTimeout: 30_000,
        multipleStatements: false
      });
    } catch (error) {
      if (attempt >= dbConnectRetries) {
        throw error;
      }

      console.log(`Waiting for MySQL at ${dbHost}:${dbPort} (${attempt}/${dbConnectRetries})`);
      await sleep(dbConnectRetryMs);
    }
  }

  throw new Error("Unable to create MySQL connection");
}

async function createTables(connection: Connection): Promise<void> {
  await connection.execute(createCas9Sql);
  await connection.execute(createCas12Sql);
  await connection.execute(createGrnaSql);
  await connection.execute(createBackendJobsSql);
  console.log("Database tables are ready");
}

async function downloadFromGoogleDrive(fileId: string, outputPath: string): Promise<void> {
  if (existsSync(outputPath) && statSync(outputPath).size > 0) {
    await ensureNotHtml(outputPath);
    console.log(`Skip existing file: ${outputPath}`);
    return;
  }

  const firstUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  let response = await fetch(firstUrl);

  if (isHtmlResponse(response)) {
    const html = await response.text();
    const confirmUrl = getGoogleDriveConfirmUrl(html, fileId);
    if (!confirmUrl) {
      throw new Error(`Google Drive did not return a downloadable CSV URL for ${basename(outputPath)}`);
    }
    response = await fetch(confirmUrl);
  }

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${basename(outputPath)}: HTTP ${response.status}`);
  }

  await pipeline(Readable.fromWeb(response.body as unknown as ReadableStream<Uint8Array>), createWriteStream(outputPath));
  await ensureNotHtml(outputPath);
  console.log(`Downloaded: ${outputPath}`);
}

async function ensureNotHtml(filePath: string): Promise<void> {
  const file = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(1000);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    const head = buffer.subarray(0, bytesRead).toString("utf8").toLowerCase();
    if (head.includes("<!doctype html") || head.includes("<html")) {
      throw new Error(`${filePath} is HTML, not CSV`);
    }
  } finally {
    await file.close();
  }
}

function isHtmlResponse(response: Response): boolean {
  return response.headers.get("content-type")?.toLowerCase().includes("text/html") ?? false;
}

function getGoogleDriveConfirmUrl(html: string, fileId: string): string | null {
  const hrefMatch = html.match(/href="([^"]*(?:uc|download)[^"]*confirm=[^"]+)"/);
  if (hrefMatch?.[1]) {
    return absoluteGoogleUrl(decodeHtmlEntities(hrefMatch[1]));
  }

  const formAction = html.match(/<form[^>]*id="download-form"[^>]*action="([^"]+)"/)?.[1];
  if (formAction) {
    const params = new URLSearchParams();
    const inputRegex = /<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"[^>]*>/g;
    for (const match of html.matchAll(inputRegex)) {
      params.set(match[1], decodeHtmlEntities(match[2]));
    }
    return `${absoluteGoogleUrl(decodeHtmlEntities(formAction))}?${params.toString()}`;
  }

  return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
}

function absoluteGoogleUrl(url: string): string {
  if (url.startsWith("http")) {
    return url;
  }
  return `https://drive.google.com${url.startsWith("/") ? "" : "/"}${url}`;
}

function decodeHtmlEntities(value: string): string {
  return value.replaceAll("&amp;", "&").replaceAll("&quot;", "\"").replaceAll("&#39;", "'");
}

async function importCsv(connection: Connection, config: DatasetConfig, filePath: string): Promise<void> {
  const parser = createReadStream(filePath).pipe(
    parse({
      bom: true,
      columns: true,
      skip_empty_lines: true
    })
  ) as AsyncIterable<CsvRow>;

  let batch: SqlValue[][] = [];
  let imported = 0;

  for await (const row of parser) {
    batch.push(config.toValues(row));

    if (batch.length >= batchSize) {
      await insertBatch(connection, config, batch);
      imported += batch.length;
      console.log(`${config.label} inserted: ${imported} rows processed`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await insertBatch(connection, config, batch);
    imported += batch.length;
  }

  console.log(`${config.label} data inserted successfully: ${imported} rows processed`);
}

async function shouldSkipImport(connection: Connection, config: DatasetConfig): Promise<boolean> {
  if (process.env.FORCE_DB_IMPORT === "true") {
    return false;
  }

  const [rows] = await connection.query<Array<{ total: number } & mysql.RowDataPacket>>(
    `SELECT COUNT(*) AS total FROM ${escapeId(config.tableName)}`
  );
  return Number(rows[0]?.total ?? 0) > 0;
}

async function insertBatch(connection: Connection, config: DatasetConfig, rows: SqlValue[][]): Promise<void> {
  const columnList = config.dbColumns.map((column) => escapeId(column)).join(", ");
  const rowPlaceholder = `(${config.dbColumns.map(() => "?").join(", ")})`;
  const placeholders = rows.map(() => rowPlaceholder).join(", ");
  const sql = `INSERT IGNORE INTO ${escapeId(config.tableName)} (${columnList}) VALUES ${placeholders}`;
  await connection.execute(sql, rows.flat());
}

function sqlValue(value: string | undefined): string | null {
  if (value === undefined || value.trim() === "" || value.trim().toLowerCase() === "nan") {
    return null;
  }
  return value;
}

function numberValue(value: string | undefined): number | null {
  const text = sqlValue(value);
  if (text === null) {
    return null;
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function normalizeTrnaFeature(value: string | undefined): "TRUE" | "FALSE" | null {
  const text = sqlValue(value)?.trim().toUpperCase();
  if (!text) {
    return null;
  }

  if (["TRUE", "T", "1", "YES", "Y"].includes(text)) {
    return "TRUE";
  }

  if (["FALSE", "F", "0", "NO", "N"].includes(text)) {
    return "FALSE";
  }

  return null;
}

function numberEnv(name: string, fallback?: number): number | undefined {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number`);
  }

  return parsed;
}

function discoverDockerComposeMysqlPort(): number | undefined {
  try {
    const output = execFileSync("docker-compose", ["port", "mysql", "3306"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    const port = Number(output.split(":").at(-1));
    return Number.isFinite(port) ? port : undefined;
  } catch {
    return undefined;
  }
}

function resolveDbPort(): number {
  const envPort = numberEnv("DB_PORT");
  if (process.env.NODE_ENV === "production") {
    return envPort ?? 3306;
  }

  return discoverDockerComposeMysqlPort() ?? envPort ?? 3306;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

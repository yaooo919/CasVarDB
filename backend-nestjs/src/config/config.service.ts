import "dotenv/config";
import { execFileSync } from "node:child_process";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AppConfigService {
  readonly nodeEnv = this.getString("NODE_ENV", "development");
  readonly port = this.getNumber("PORT", 8888);

  readonly db = {
    host: this.getString("DB_HOST", "127.0.0.1"),
    port:
      this.nodeEnv === "production"
        ? (this.getOptionalNumber("DB_PORT") ?? 3306)
        : (this.discoverDockerComposeMysqlPort() ?? this.getOptionalNumber("DB_PORT") ?? 3306),
    user: this.getString("DB_USER", "collab_casvardb"),
    password: this.getString("DB_PASSWORD", "Cv2y*%"),
    database: this.getString("DB_NAME", "casvardb"),
    connectionLimit: this.getNumber("DB_CONNECTION_LIMIT", 10)
  };

  readonly sqs = {
    region: this.getString("AWS_REGION", "ap-southeast-2"),
    endpoint: this.getOptionalString("SQS_ENDPOINT"),
    queueName: this.getOptionalString("SQS_QUEUE_NAME"),
    queueUrl: this.getOptionalString("SQS_QUEUE_URL"),
    waitTimeSeconds: this.getNumber("SQS_WAIT_TIME_SECONDS", 10),
    visibilityTimeoutSeconds: this.getNumber("SQS_VISIBILITY_TIMEOUT_SECONDS", 300)
  };

  readonly worker = {
    pollIntervalMs: this.getNumber("WORKER_POLL_INTERVAL_MS", 1000)
  };

  private getString(name: string, fallback: string): string {
    const value = process.env[name];
    return value && value.trim() !== "" ? value : fallback;
  }

  private getOptionalString(name: string): string | undefined {
    const value = process.env[name];
    return value && value.trim() !== "" ? value : undefined;
  }

  private getNumber(name: string, fallback: number): number {
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

  private getOptionalNumber(name: string): number | undefined {
    const value = process.env[name];
    if (!value) {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error(`${name} must be a number`);
    }

    return parsed;
  }

  private discoverDockerComposeMysqlPort(): number | undefined {
    if (this.nodeEnv === "production") {
      return undefined;
    }

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
}

import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { MultipartFile } from "@fastify/multipart";

type UserMetadata = Record<string, unknown> | { raw: string };

export type SubmitResponse = {
  message: string;
  fileName: string;
  filePath: string;
  metadataSavedTo: string;
  parsedMetadataKind: "raw" | "json";
};

@Injectable()
export class SubmitService {
  private readonly uploadDir = join(process.cwd(), "uploads");

  async saveSubmission(file: MultipartFile): Promise<SubmitResponse | undefined> {
    await mkdir(this.uploadDir, { recursive: true });

    const storedFileName = `${Date.now()}__${this.safeFileName(file.filename)}`;
    const filePath = join(this.uploadDir, storedFileName);
    let fileSize = 0;

    try {
      file.file.on("data", (chunk: Buffer | string) => {
        fileSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
      });
      await pipeline(file.file, createWriteStream(filePath));
    } catch (error) {
      throw new InternalServerErrorException("Failed to save uploaded file.", { cause: error });
    }

    const rawMetadata = this.getFieldValue(file, "metadata");
    if (!rawMetadata) {
      return undefined;
    }

    const userMetadata = this.parseMetadata(rawMetadata);
    const metadataPath = join(this.uploadDir, `${basename(filePath)}.meta.json`);
    const record = {
      uploadedAt: new Date().toISOString(),
      originalFileName: file.filename,
      storedFileName: basename(filePath),
      fileSize,
      mimeType: file.mimetype,
      userMetadata
    };

    try {
      await writeFile(metadataPath, JSON.stringify(record, null, 2), "utf8");
    } catch (error) {
      throw new InternalServerErrorException("Failed to save metadata.", { cause: error });
    }

    return {
      message: "File & metadata uploaded successfully.",
      fileName: file.filename,
      filePath,
      metadataSavedTo: metadataPath,
      parsedMetadataKind: "raw" in userMetadata ? "raw" : "json"
    };
  }

  private parseMetadata(rawMetadata: string): UserMetadata {
    try {
      const parsed: unknown = JSON.parse(rawMetadata);
      return this.isRecord(parsed) ? parsed : { raw: rawMetadata };
    } catch {
      return { raw: rawMetadata };
    }
  }

  private getFieldValue(file: MultipartFile, fieldName: string): string | undefined {
    const field = file.fields[fieldName];
    if (!field || Array.isArray(field) || field.type !== "field") {
      return undefined;
    }

    return typeof field.value === "string" ? field.value : String(field.value);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private safeFileName(fileName: string): string {
    return fileName.replace(/[^a-z0-9.\-_]/gi, "_");
  }
}

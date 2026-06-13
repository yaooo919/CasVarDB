export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0] ?? {});
  const body = rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(","));
  return [headers.join(","), ...body].join("\n");
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = stringifyCsvValue(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function stringifyCsvValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

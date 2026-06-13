import { escapeId } from "mysql2";

export function sqlIdentifier(identifier: string): string {
  return escapeId(identifier);
}

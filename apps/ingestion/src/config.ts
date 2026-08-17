import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadRootEnv(): void {
  const envPath = resolve(import.meta.dirname, "../../../.env");
  let text: string;
  try {
    text = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadRootEnv();

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  databaseUrl: process.env.DATABASE_URL?.trim() ?? "postgres://opendev:opendev@localhost:5432/opendev",
  githubToken: process.env.GITHUB_TOKEN?.trim() ?? "",
  lookbackDays: optionalNumber("LOOKBACK_DAYS", 365),
  intervalHours: optionalNumber("INGEST_INTERVAL_HOURS", 4),
  healthPort: optionalNumber("INGEST_HEALTH_PORT", 8081),
  pageSize: optionalNumber("INGEST_PAGE_SIZE", 25),
  maxPages: optionalNumber("INGEST_MAX_PAGES", 400),
};

export function requireGitHubToken(): string {
  return required("GITHUB_TOKEN");
}

export function lookbackCutoff(now = new Date()): Date {
  return new Date(now.getTime() - config.lookbackDays * 24 * 60 * 60 * 1000);
}

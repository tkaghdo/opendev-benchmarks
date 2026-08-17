import http from "node:http";
import type pg from "pg";
import { pingDatabase } from "./db/pool";
import { latestRun } from "./db/runs";

export function startHealthServer(pool: pg.Pool, port: number): http.Server {
  const server = http.createServer(async (_req, res) => {
    const db = await pingDatabase(pool);
    const run = db ? await latestRun(pool).catch(() => null) : null;
    const ok = db;
    const body = JSON.stringify({
      ok,
      service: "opendev-ingestion",
      database: db ? "up" : "down",
      lastRun: run,
    });
    res.writeHead(ok ? 200 : 503, { "Content-Type": "application/json" });
    res.end(body);
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(`Ingestion health on :${port}/health`);
  });
  return server;
}

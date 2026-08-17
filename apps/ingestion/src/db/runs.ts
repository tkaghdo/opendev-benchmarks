import type pg from "pg";

export async function startRun(pool: pg.Pool): Promise<number> {
  const result = await pool.query<{ id: number }>(
    `insert into ingestion_runs (status, rows_upserted) values ('running', 0) returning id`,
  );
  return result.rows[0].id;
}

export async function finishRun(
  pool: pg.Pool,
  id: number,
  input: { status: "success" | "failed"; rowsUpserted: number; githubRemaining: number | null; error?: string },
): Promise<void> {
  await pool.query(
    `update ingestion_runs
     set finished_at = now(), status = $2, rows_upserted = $3, github_remaining = $4, error = $5
     where id = $1`,
    [id, input.status, input.rowsUpserted, input.githubRemaining, input.error ?? null],
  );
}

export async function latestRun(pool: pg.Pool): Promise<{
  id: number;
  status: string;
  started_at: Date;
  finished_at: Date | null;
  rows_upserted: number;
  github_remaining: number | null;
  error: string | null;
} | null> {
  const result = await pool.query(
    `select id, status, started_at, finished_at, rows_upserted, github_remaining, error
     from ingestion_runs
     order by started_at desc
     limit 1`,
  );
  return result.rows[0] ?? null;
}

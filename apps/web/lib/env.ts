export function redactDatabaseUrl(url: string): string {
  return url.replace(/:[^:@/]+@/, ":***@");
}

export function warehouseUrl(): string {
  const url = process.env.DATABASE_URL?.trim() ?? "postgres://opendev:opendev@localhost:5432/opendev";
  const lower = url.toLowerCase();
  if (
    lower.includes("15432") ||
    lower.includes("ecadmin") ||
    lower.includes("embedded-canvas") ||
    lower.includes("embeddedcanvas")
  ) {
    throw new Error(
      `DATABASE_URL points at the Embedded Canvas control-plane database (${redactDatabaseUrl(url)}). ` +
        `OpenDev must use postgres://opendev:opendev@localhost:5432/opendev.`,
    );
  }
  return url;
}

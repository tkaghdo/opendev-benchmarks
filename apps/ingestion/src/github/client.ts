export class GitHubClient {
  constructor(private readonly token: string | undefined) {}

  async rateLimitRemaining(): Promise<number | null> {
    if (!this.token) return null;
    const res = await fetch("https://api.github.com/rate_limit", {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "opendev-benchmarks-ingestion",
      },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { rate?: { remaining?: number } };
    return body.rate?.remaining ?? null;
  }
}

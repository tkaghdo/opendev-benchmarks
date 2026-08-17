import { sleep } from "../sleep";
import type { RateLimit } from "./types";

const USER_AGENT = "opendev-benchmarks-ingestion";

export class GitHubHttp {
  remaining = 5000;
  resetAt = new Date(Date.now() + 60 * 60 * 1000);

  constructor(private readonly token: string) {}

  note(limit: RateLimit | null | undefined, headers?: Headers): void {
    if (limit?.remaining != null) this.remaining = limit.remaining;
    if (limit?.resetAt) this.resetAt = new Date(limit.resetAt);
    const headerRemaining = headers?.get("x-ratelimit-remaining");
    const headerReset = headers?.get("x-ratelimit-reset");
    if (headerRemaining) this.remaining = Number(headerRemaining);
    if (headerReset) this.resetAt = new Date(Number(headerReset) * 1000);
  }

  async throttle(): Promise<void> {
    if (this.remaining > 200) return;
    const wait = Math.max(this.resetAt.getTime() - Date.now(), 1000) + 1000;
    console.log(`GitHub rate limit remaining=${this.remaining}; sleeping ${Math.ceil(wait / 1000)}s`);
    await sleep(wait);
    this.remaining = 5000;
  }

  async request(url: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
    await this.throttle();
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": USER_AGENT,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    this.note(null, res.headers);

    if (res.status === 403 || res.status === 429 || res.status >= 500) {
      if (attempt >= 6) {
        throw new Error(`GitHub ${res.status} ${res.statusText} after retries: ${url}`);
      }
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 2000;
      console.log(`GitHub ${res.status}; retry in ${Math.ceil(backoff / 1000)}s (${url})`);
      await sleep(backoff);
      return this.request(url, init, attempt + 1);
    }

    return res;
  }

  async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await this.request("https://api.github.com/graphql", {
      method: "POST",
      body: JSON.stringify({ query, variables }),
    });
    const body = (await res.json()) as {
      data?: T & { rateLimit?: RateLimit };
      errors?: Array<{ message: string }>;
    };
    this.note(body.data?.rateLimit ?? null, res.headers);
    if (!res.ok) {
      throw new Error(`GitHub GraphQL HTTP ${res.status}`);
    }
    if (body.errors?.length) {
      throw new Error(body.errors.map((err) => err.message).join("; "));
    }
    if (!body.data) throw new Error("GitHub GraphQL returned no data");
    return body.data;
  }

  async rest<T>(path: string): Promise<T> {
    const res = await this.request(`https://api.github.com${path}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub REST ${res.status} ${path}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }
}

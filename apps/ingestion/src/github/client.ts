import { GitHubHttp } from "./http";
import { REPO_COMMITS, REPO_ISSUES, REPO_META, REPO_PULL_REQUESTS } from "./queries";
import type { CommitNode, IssueNode, PageInfo, PullRequestNode, RepoMeta } from "./types";

type GraphQLEnvelope = {
  rateLimit?: { remaining: number; resetAt: string; cost: number };
  repository: unknown;
};

export class GitHubClient {
  readonly http: GitHubHttp;

  constructor(token: string) {
    this.http = new GitHubHttp(token);
  }

  get remaining(): number {
    return this.http.remaining;
  }

  async org(login: string): Promise<{ created_at: string | null; avatar_url: string | null }> {
    const body = await this.http.rest<{ created_at?: string; avatar_url?: string }>(`/orgs/${login}`);
    return { created_at: body.created_at ?? null, avatar_url: body.avatar_url ?? null };
  }

  async repoMeta(owner: string, name: string): Promise<RepoMeta | null> {
    const data = await this.http.graphql<GraphQLEnvelope & { repository: RepoMeta | null }>(REPO_META, {
      owner,
      name,
    });
    return data.repository;
  }

  async pullRequests(
    owner: string,
    name: string,
    cursor: string | null,
    pageSize: number,
  ): Promise<{ nodes: PullRequestNode[]; pageInfo: PageInfo }> {
    const data = await this.http.graphql<
      GraphQLEnvelope & {
        repository: { pullRequests: { nodes: PullRequestNode[]; pageInfo: PageInfo } } | null;
      }
    >(REPO_PULL_REQUESTS, { owner, name, cursor, pageSize });
    const connection = data.repository?.pullRequests;
    return {
      nodes: (connection?.nodes ?? []).filter((node): node is PullRequestNode => Boolean(node)),
      pageInfo: connection?.pageInfo ?? { hasNextPage: false, endCursor: null },
    };
  }

  async issues(
    owner: string,
    name: string,
    cursor: string | null,
    pageSize: number,
  ): Promise<{ nodes: IssueNode[]; pageInfo: PageInfo }> {
    const data = await this.http.graphql<
      GraphQLEnvelope & {
        repository: { issues: { nodes: IssueNode[]; pageInfo: PageInfo } } | null;
      }
    >(REPO_ISSUES, { owner, name, cursor, pageSize });
    const connection = data.repository?.issues;
    return {
      nodes: (connection?.nodes ?? []).filter((node): node is IssueNode => Boolean(node)),
      pageInfo: connection?.pageInfo ?? { hasNextPage: false, endCursor: null },
    };
  }

  async commits(
    owner: string,
    name: string,
    cursor: string | null,
    pageSize: number,
    since: string,
  ): Promise<{ nodes: CommitNode[]; pageInfo: PageInfo }> {
    const data = await this.http.graphql<
      GraphQLEnvelope & {
        repository: {
          defaultBranchRef: {
            target: { history: { nodes: CommitNode[]; pageInfo: PageInfo } };
          } | null;
        } | null;
      }
    >(REPO_COMMITS, { owner, name, cursor, pageSize, since });
    const history = data.repository?.defaultBranchRef?.target?.history;
    return {
      nodes: (history?.nodes ?? []).filter((node): node is CommitNode => Boolean(node?.oid)),
      pageInfo: history?.pageInfo ?? { hasNextPage: false, endCursor: null },
    };
  }
}

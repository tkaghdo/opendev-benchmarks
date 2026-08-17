export type Actor = {
  __typename?: string;
  login?: string | null;
  databaseId?: number | null;
} | null;

export type RateLimit = {
  remaining: number;
  resetAt?: string;
  reset?: number;
  cost?: number;
};

export type RepoMeta = {
  databaseId: number;
  name: string;
  nameWithOwner: string;
  isPrivate: boolean;
  stargazerCount: number;
  createdAt: string;
  updatedAt: string;
  primaryLanguage: { name: string } | null;
};

export type PullRequestNode = {
  databaseId: number | null;
  number: number;
  state: string;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  additions: number | null;
  deletions: number | null;
  changedFiles: number | null;
  author: Actor;
  reviews: {
    nodes: Array<{
      databaseId: number | null;
      state: string;
      submittedAt: string | null;
      author: Actor;
    } | null>;
  } | null;
};

export type IssueNode = {
  databaseId: number | null;
  number: number;
  state: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  author: Actor;
  labels: { nodes: Array<{ name: string } | null> } | null;
};

export type CommitNode = {
  oid: string;
  committedDate: string;
  additions: number | null;
  deletions: number | null;
  author: { user: Actor } | null;
};

export type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

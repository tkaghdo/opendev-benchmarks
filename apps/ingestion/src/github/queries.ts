export const REPO_META = `
query RepoMeta($owner: String!, $name: String!) {
  rateLimit { remaining resetAt cost }
  repository(owner: $owner, name: $name) {
    databaseId
    name
    nameWithOwner
    isPrivate
    stargazerCount
    createdAt
    updatedAt
    primaryLanguage { name }
  }
}
`;

export const REPO_PULL_REQUESTS = `
query RepoPullRequests($owner: String!, $name: String!, $cursor: String, $pageSize: Int!) {
  rateLimit { remaining resetAt cost }
  repository(owner: $owner, name: $name) {
    pullRequests(first: $pageSize, after: $cursor, orderBy: { field: UPDATED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        databaseId
        number
        state
        createdAt
        updatedAt
        mergedAt
        closedAt
        additions
        deletions
        changedFiles
        author {
          __typename
          login
          ... on User { databaseId }
          ... on Bot { databaseId }
        }
        reviews(first: 40) {
          nodes {
            databaseId
            state
            submittedAt
            author {
              __typename
              login
              ... on User { databaseId }
              ... on Bot { databaseId }
            }
          }
        }
      }
    }
  }
}
`;

export const REPO_ISSUES = `
query RepoIssues($owner: String!, $name: String!, $cursor: String, $pageSize: Int!) {
  rateLimit { remaining resetAt cost }
  repository(owner: $owner, name: $name) {
    issues(first: $pageSize, after: $cursor, orderBy: { field: UPDATED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        databaseId
        number
        state
        createdAt
        updatedAt
        closedAt
        author {
          __typename
          login
          ... on User { databaseId }
          ... on Bot { databaseId }
        }
        labels(first: 10) {
          nodes { name }
        }
      }
    }
  }
}
`;

export const REPO_COMMITS = `
query RepoCommits($owner: String!, $name: String!, $cursor: String, $pageSize: Int!, $since: GitTimestamp) {
  rateLimit { remaining resetAt cost }
  repository(owner: $owner, name: $name) {
    defaultBranchRef {
      target {
        ... on Commit {
          history(first: $pageSize, after: $cursor, since: $since) {
            pageInfo { hasNextPage endCursor }
            nodes {
              oid
              committedDate
              additions
              deletions
              author { user { databaseId login } }
            }
          }
        }
      }
    }
  }
}
`;

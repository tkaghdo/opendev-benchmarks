export type LaunchOrg = {
  id: string;
  name: string;
  githubLogin: string;
  avatarUrl: string;
  /** Flagship public repos ingested in Build 1. Not every repo in the org. */
  repos: string[];
};

export const LAUNCH_ORGS: LaunchOrg[] = [
  {
    id: "vercel",
    name: "Vercel",
    githubLogin: "vercel",
    avatarUrl: "https://github.com/vercel.png",
    repos: ["next.js", "turbo", "ai"],
  },
  {
    id: "supabase",
    name: "Supabase",
    githubLogin: "supabase",
    avatarUrl: "https://github.com/supabase.png",
    repos: ["supabase", "postgres"],
  },
  {
    id: "prisma",
    name: "Prisma",
    githubLogin: "prisma",
    avatarUrl: "https://github.com/prisma.png",
    repos: ["prisma"],
  },
  {
    id: "temporal",
    name: "Temporal",
    githubLogin: "temporalio",
    avatarUrl: "https://github.com/temporalio.png",
    repos: ["temporal", "sdk-typescript"],
  },
  {
    id: "hashicorp",
    name: "HashiCorp",
    githubLogin: "hashicorp",
    avatarUrl: "https://github.com/hashicorp.png",
    repos: ["terraform", "vault", "consul"],
  },
];

export function getOrg(idOrLogin: string): LaunchOrg | undefined {
  const needle = idOrLogin.trim().toLowerCase();
  return LAUNCH_ORGS.find(
    (org) => org.id === needle || org.githubLogin.toLowerCase() === needle || org.name.toLowerCase() === needle,
  );
}

export function searchOrgs(query: string): LaunchOrg[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return LAUNCH_ORGS;
  return LAUNCH_ORGS.filter(
    (org) =>
      org.id.includes(needle) ||
      org.githubLogin.toLowerCase().includes(needle) ||
      org.name.toLowerCase().includes(needle),
  );
}

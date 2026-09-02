export const DEMO_TENANT_COOKIE = "opendev_demo_tenant";

export const DEMO_ORG_IDS = ["vercel", "supabase", "prisma", "temporal", "hashicorp"] as const;

export type DemoOrgId = (typeof DEMO_ORG_IDS)[number];

export function isDemoOrgId(value: string | undefined | null): value is DemoOrgId {
  return Boolean(value && (DEMO_ORG_IDS as readonly string[]).includes(value));
}

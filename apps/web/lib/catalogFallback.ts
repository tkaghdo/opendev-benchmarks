import { LAUNCH_ORGS, getOrg as getCatalogOrg } from "@opendev/catalog";
import { getOrg, listOrgs, type WarehouseOrg } from "./warehouse";

function catalogAsWarehouse(org: (typeof LAUNCH_ORGS)[number]): WarehouseOrg {
  return {
    id: org.id,
    name: org.name,
    githubLogin: org.githubLogin,
    avatarUrl: org.avatarUrl,
    repoCount: org.repos.length,
  };
}

export async function getOrgWithFallback(idOrLogin: string): Promise<WarehouseOrg | null> {
  try {
    const org = await getOrg(idOrLogin);
    if (org) return org;
  } catch {
    /* warehouse optional for demo shells */
  }
  const catalog = getCatalogOrg(idOrLogin);
  return catalog ? catalogAsWarehouse(catalog) : null;
}

export async function listOrgsWithFallback(): Promise<WarehouseOrg[]> {
  try {
    const orgs = await listOrgs();
    if (orgs.length > 0) return orgs;
  } catch {
    /* fall through to catalog */
  }
  return LAUNCH_ORGS.map(catalogAsWarehouse);
}

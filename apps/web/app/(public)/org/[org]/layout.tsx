import Image from "next/image";
import { Suspense } from "react";
import { OrgChrome } from "@/components/OrgChrome";
import { getOrg } from "@/lib/warehouse";
import { MissingOrg } from "@/components/MissingOrg";

export const dynamic = "force-dynamic";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ org: string }>;
}) {
  const { org: orgId } = await params;
  let org = null;
  let warehouseError = false;
  try {
    org = await getOrg(orgId);
  } catch {
    warehouseError = true;
  }

  if (warehouseError) {
    return (
      <MissingOrg
        slug={orgId}
        title="Warehouse unreachable"
        body="This organization page reads Postgres, never GitHub. Start the warehouse and try again."
      />
    );
  }
  if (!org) {
    return (
      <MissingOrg
        slug={orgId}
        title="Organization not in OpenDev"
        body={`${orgId} is not in the launch warehouse. Search from Explore or pick a featured organization.`}
      />
    );
  }

  return (
    <article>
      <header className="org-header">
        {org.avatarUrl ? (
          <Image src={org.avatarUrl} alt="" width={48} height={48} unoptimized />
        ) : null}
        <div>
          <p className="kicker">Engineering</p>
          <h1 className="org-title">{org.name} Engineering</h1>
          <p className="org-meta">
            {org.githubLogin}
            {org.repoCount > 0 ? ` · ${org.repoCount} public repos in the warehouse` : ""}
          </p>
        </div>
      </header>
      <Suspense fallback={<p className="org-meta">Loading range…</p>}>
        <OrgChrome orgId={org.id} />
      </Suspense>
      {children}
    </article>
  );
}

import { getOrg } from "@opendev/catalog";
import Image from "next/image";
import { notFound } from "next/navigation";
import { OrgTabs } from "@/components/OrgTabs";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ org: string }>;
}) {
  const { org: orgId } = await params;
  const org = getOrg(orgId);
  if (!org) notFound();

  return (
    <article>
      <header style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Image src={org.avatarUrl} alt="" width={48} height={48} unoptimized />
        <div>
          <p className="kicker">Engineering</p>
          <h1 style={{ margin: 0, letterSpacing: "-0.04em" }}>{org.name} Engineering</h1>
        </div>
      </header>
      <OrgTabs orgId={org.id} />
      {children}
    </article>
  );
}

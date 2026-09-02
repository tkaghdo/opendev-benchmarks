import { RangeControl } from "@/components/RangeControl";
import { OrgTabs } from "@/components/OrgTabs";

export function OrgChrome({ orgId }: { orgId: string }) {
  return (
    <>
      <OrgTabs orgId={orgId} />
      <RangeControl />
    </>
  );
}

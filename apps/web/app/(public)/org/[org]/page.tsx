import { MetricPlaceholders, RevealLink } from "@/components/MetricPlaceholders";
import { StubPanel } from "@/components/StubPanel";

export default function OrgOverviewPage() {
  return (
    <>
      <MetricPlaceholders />
      <StubPanel build="Build 4">
        Trusted Cube metrics and OpenDev-median comparisons replace these placeholders. Chromeless
        Embedded Canvas charts replace temporary visualizations in Build 5.
      </StubPanel>
      <RevealLink />
    </>
  );
}

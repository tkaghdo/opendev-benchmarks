import { LAUNCH_METRICS } from "@opendev/catalog";
import Link from "next/link";
import { StubPanel } from "@/components/StubPanel";

export default function HowItWorksPage() {
  const cycle = LAUNCH_METRICS.find((metric) => metric.key === "median_cycle_time");

  return (
    <section>
      <p className="kicker">How it works</p>
      <h1>Build analytics once. Deliver them three ways.</h1>
      <p className="lede">
        GitHub → ingestion → Postgres → Cube → Embedded Canvas → Public OpenDev, customer
        embed, and internal analytics. Cube is infrastructure. Embedded Canvas is the control
        plane. Apache is the hosted dashboard builder, not a product visitors buy.
      </p>
      <h2>Median PR cycle time</h2>
      <p>
        {cycle?.formula}. Source: {cycle?.source}. Semantic measure:{" "}
        <code>{cycle?.cubeMeasure}</code>
      </p>
      <StubPanel build="Builds 5–7">
        Live security-context switching and chromeless embeds land here.{" "}
        <Link href="/demo/customer/vercel">DevMetrics customer shell</Link>
        {" · "}
        <Link href="/demo/internal">Internal shell</Link>
      </StubPanel>
    </section>
  );
}

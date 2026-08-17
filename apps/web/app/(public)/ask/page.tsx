import { StubPanel } from "@/components/StubPanel";

const examples = [
  "Which organizations improved PR cycle time the most over the last six months?",
  "Compare Vercel and Supabase.",
  "Which projects have the fastest issue resolution?",
  "Which organizations are gaining contributors fastest?",
  "Show organizations where PR size increased while cycle time decreased.",
  "Which Vercel repositories have the slowest review times?",
];

export default function AskPage() {
  return (
    <section>
      <h1>Ask OpenDev</h1>
      <p className="lede">Ask anything about the data. Answers must use defined metrics, not free-form SQL.</p>
      <form className="search">
        <input disabled placeholder="Ask anything about the data..." aria-label="Ask OpenDev" />
        <button type="submit" disabled>
          Ask
        </button>
      </form>
      <ul>
        {examples.map((question) => (
          <li key={question} style={{ color: "var(--text-muted)", marginBottom: 8 }}>
            {question}
          </li>
        ))}
      </ul>
      <StubPanel build="Build 9">
        Natural language maps to Cube queries and Embedded Canvas host filters. Not a launch blocker.
      </StubPanel>
    </section>
  );
}

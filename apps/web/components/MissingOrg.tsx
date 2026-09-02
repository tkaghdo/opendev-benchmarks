import Link from "next/link";

export function MissingOrg({
  slug,
  title,
  body,
}: {
  slug: string;
  title: string;
  body: string;
}) {
  return (
    <section>
      <p className="kicker">Missing organization</p>
      <h1>{title}</h1>
      <p className="lede">{body}</p>
      <p className="empty-state">Looked up “{slug}” in Postgres. No GitHub request was made.</p>
      <p>
        <Link href="/">Back to Explore</Link>
        {" · "}
        <Link href="/compare">Compare</Link>
      </p>
    </section>
  );
}

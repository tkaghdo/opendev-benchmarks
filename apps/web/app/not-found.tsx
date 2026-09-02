import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell">
      <main className="shell-main">
        <p className="kicker">Not found</p>
        <h1>That page is not in OpenDev</h1>
        <p className="lede">
          Missing organizations and unknown routes stay in this catalog. Nothing here calls GitHub.
        </p>
        <p>
          <Link href="/">Back to Explore</Link>
          {" · "}
          <Link href="/compare">Compare</Link>
        </p>
      </main>
    </div>
  );
}

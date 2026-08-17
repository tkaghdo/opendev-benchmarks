import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell">
      <main className="shell-main">
        <h1>Not found</h1>
        <p className="lede">That organization or page is not in the OpenDev catalog yet.</p>
        <p>
          <Link href="/">Back to OpenDev</Link>
        </p>
      </main>
    </div>
  );
}

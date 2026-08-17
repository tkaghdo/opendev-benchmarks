import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span>Analytics powered by Embedded Canvas</span>
        <span>
          <Link href="/how-it-works">See how OpenDev was built</Link>
          {" · "}
          <Link href="/how-it-works">Want analytics like this inside your product?</Link>
        </span>
      </div>
    </footer>
  );
}

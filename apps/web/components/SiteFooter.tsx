import Link from "next/link";
import { GITHUB_REPO_URL, PRODUCT_HOME_URL } from "@/lib/publicLinks";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span>
          Analytics powered by{" "}
          <a href={PRODUCT_HOME_URL} rel="noopener noreferrer">
            Embedded Canvas
          </a>
        </span>
        <span>
          <Link href="/how-it-works">See how OpenDev was built</Link>
          {" · "}
          <a href={GITHUB_REPO_URL} rel="noopener noreferrer">
            Source on GitHub
          </a>
          {" · "}
          <a href={PRODUCT_HOME_URL} rel="noopener noreferrer">
            Want analytics like this inside your product?
          </a>
        </span>
      </div>
    </footer>
  );
}

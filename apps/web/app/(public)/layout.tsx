import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <SiteHeader />
      <main className="shell-main">{children}</main>
      <SiteFooter />
    </div>
  );
}

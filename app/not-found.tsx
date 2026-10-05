import Link from "next/link";
import type { Metadata } from "next";
import { ResponsiveBanner } from "@/components/integrations/responsive-banner";

export const metadata: Metadata = {
  title: { absolute: "Page Not Found" },
  description: "That Dream Car Collection page is not available.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
    <main className="site-container grid min-h-[65vh] place-items-center py-20 text-center">
      <div>
        <p className="eyebrow">404</p>
        <h1>Page Not Found</h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
          That Dream Car Collection page is not available. Use the links below to return to the wiki or open one of the main guides.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="button-primary">Home</Link>
          <Link href="/codes/" className="button-secondary">Codes</Link>
          <Link href="/how-to-play/" className="button-secondary">How to Play</Link>
        </div>
      </div>
    </main>
    <ResponsiveBanner />
    </>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { assetPath } from "@/lib/urls";

export function ResponsiveBanner({ reserveSpace = true }: { reserveSpace?: boolean } = {}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let observer: MutationObserver | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Cancel React Strict Mode's discarded mount before any provider script runs.
    queueMicrotask(() => {
      if (disposed) return;
      const mobile = !window.matchMedia("(min-width: 768px)").matches;
      host.dataset.status = "pending";
      host.dataset.size = mobile ? "320x50" : "728x90";
      const frame = document.createElement("iframe");
      frame.title = "Advertisement";
      frame.width = mobile ? "320" : "728";
      frame.height = mobile ? "50" : "90";
      // A separate document preserves the official parser-time scripts and
      // document.write semantics, without replacing the Next.js document.
      frame.src = assetPath(`/adsterra/banner-${mobile ? "mobile" : "desktop"}.html`);
      const fail = () => {
        if (disposed) return;
        host.dataset.status = "empty";
        frame.remove();
        observer?.disconnect();
        resizeObserver?.disconnect();
        if (timer) clearTimeout(timer);
      };
      frame.onerror = fail;
      frame.onload = () => {
        const doc = frame.contentDocument;
        if (!doc) return fail();
        const check = () => {
          if (disposed) return;
          if (doc.documentElement.dataset.adStatus === "error") return fail();
          const creative = [...doc.querySelectorAll("iframe, img, object, embed")].some((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
          if (!creative && host.dataset.status === "filled") return fail();
          host.dataset.status = creative ? "filled" : "pending";
        };
        observer = new MutationObserver(check);
        observer.observe(doc.body, { childList: true, subtree: true, attributes: true });
        resizeObserver = new ResizeObserver(check);
        resizeObserver.observe(doc.body);
        check();
      };
      host.querySelector("[data-ad-content]")?.appendChild(frame);
      timer = setTimeout(() => {
        if (host.dataset.status !== "filled") fail();
      }, 15000);
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      resizeObserver?.disconnect();
      if (timer) clearTimeout(timer);
      host.querySelector("[data-ad-content]")?.replaceChildren();
    };
  }, [pathname]);

  return (
    <div ref={hostRef} className="ad-slot ad-banner" data-banner-ad-slot data-status="pending" data-reserve-space={reserveSpace} aria-label="Advertisement">
      <span className="ad-label">Advertisement</span>
      <div data-ad-content />
    </div>
  );
}

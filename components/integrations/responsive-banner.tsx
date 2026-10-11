"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { adsterra } from "@/config/adsterra";
import { observeAdSlot } from "./ad-slot-status";

const scriptId = "adsterra-responsive-banner";
type BannerOptions = { key: string; format: "iframe"; height: number; width: number; params: Record<string, never> };

export function ResponsiveBanner({ reserveSpace = true }: { reserveSpace?: boolean } = {}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let stopObserving: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let options: BannerOptions | undefined;
    const adWindow = window as Window & { atOptions?: BannerOptions };
    const previousOptions = adWindow.atOptions;

    // Cancel React Strict Mode's discarded mount before any provider script runs.
    queueMicrotask(() => {
      if (disposed) return;
      const content = host.querySelector<HTMLElement>("[data-ad-content]");
      if (!content || document.getElementById(scriptId)) {
        host.dataset.status = "empty";
        return;
      }
      // Choose once for this page instance. Resizing does not issue a second
      // impression or race an in-flight desktop script against a mobile one.
      const mobile = !window.matchMedia("(min-width: 768px)").matches;
      const banner = mobile ? adsterra.mobile : adsterra.desktop;
      host.dataset.status = "pending";
      host.dataset.size = mobile ? "320x50" : "728x90";

      // Execute the supplied GET CODE in the real page, in its original order.
      options = { key: banner.key, format: banner.format, height: banner.height, width: banner.width, params: {} };
      adWindow.atOptions = options;
      const script = document.createElement("script");
      script.id = scriptId;
      script.async = false;
      script.src = banner.scriptUrl;
      script.setAttribute(mobile ? "data-adsterra-mobile" : "data-adsterra-desktop", "");
      script.onerror = () => {
        if (!disposed && host.dataset.status !== "filled") host.dataset.status = "empty";
      };
      stopObserving = observeAdSlot(host, content);
      content.appendChild(script);

      // UI fallback only: release reserved blank space, but keep the script,
      // provider DOM and observers alive so a late creative can still render.
      timer = setTimeout(() => {
        if (!disposed && host.dataset.status !== "filled") host.dataset.status = "empty";
      }, 45000);
    });

    return () => {
      disposed = true;
      stopObserving?.();
      if (timer) clearTimeout(timer);
      host.querySelector("[data-ad-content]")?.replaceChildren();
      if (options && adWindow.atOptions === options) {
        if (previousOptions) adWindow.atOptions = previousOptions;
        else delete adWindow.atOptions;
      }
    };
  }, [pathname]);

  return (
    <div ref={hostRef} className="ad-slot ad-banner" data-banner-ad-slot data-status="pending" data-reserve-space={reserveSpace} aria-label="Advertisement">
      <span className="ad-label">Advertisement</span>
      <div data-ad-content />
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function NativeAdClient({ scriptUrl, containerId }: { scriptUrl: string; containerId: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let observer: MutationObserver | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    queueMicrotask(() => {
      if (disposed || document.getElementById(containerId)) return;
      host.dataset.status = "pending";
      const content = host.querySelector("[data-ad-content]");
      if (!content) return;
      const container = document.createElement("div");
      container.id = containerId;
      content.appendChild(container);
      const script = document.createElement("script");
      script.setAttribute("async", "async");
      script.src = scriptUrl;
      script.dataset.cfasync = "false";
      const check = () => {
        if (disposed) return;
        const filled = [...container.querySelectorAll("iframe, img, a, video")].some((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        if (!filled && host.dataset.status === "filled") return fail();
        host.dataset.status = filled ? "filled" : "pending";
      };
      const fail = () => {
        if (disposed) return;
        host.dataset.status = "empty";
        content.replaceChildren();
        observer?.disconnect();
        resizeObserver?.disconnect();
        if (timer) clearTimeout(timer);
      };
      observer = new MutationObserver(check);
      observer.observe(container, { childList: true, subtree: true, attributes: true });
      resizeObserver = new ResizeObserver(check);
      resizeObserver.observe(container);
      script.onerror = fail;
      content.insertBefore(script, container);
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
  }, [containerId, scriptUrl, pathname]);

  return <div ref={hostRef} className="ad-slot ad-native" data-native-ad-slot data-status="pending" aria-label="Advertisement">
    <span className="ad-label">Advertisement</span>
    <div data-ad-content />
  </div>;
}

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { observeAdSlot } from "./ad-slot-status";

const scriptId = "adsterra-native";

export function NativeAdClient({ scriptUrl, containerId }: { scriptUrl: string; containerId: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let stopObserving: (() => void) | undefined;
    queueMicrotask(() => {
      if (disposed || document.getElementById(containerId) || document.getElementById(scriptId)) return;
      host.dataset.status = "pending";
      const content = host.querySelector<HTMLElement>("[data-ad-content]");
      if (!content) return;
      const container = document.createElement("div");
      container.id = containerId;
      content.appendChild(container);
      const script = document.createElement("script");
      script.id = scriptId;
      script.setAttribute("data-adsterra-native", "");
      script.setAttribute("async", "async");
      script.src = scriptUrl;
      script.dataset.cfasync = "false";
      stopObserving = observeAdSlot(host, container);
      script.onerror = () => {
        if (!disposed && host.dataset.status !== "filled") host.dataset.status = "empty";
      };
      content.insertBefore(script, container);
    });

    return () => {
      disposed = true;
      stopObserving?.();
      host.querySelector("[data-ad-content]")?.replaceChildren();
    };
  }, [containerId, scriptUrl, pathname]);

  return <div ref={hostRef} className="ad-slot ad-native" data-native-ad-slot data-status="pending" aria-label="Advertisement">
    <span className="ad-label">Advertisement</span>
    <div data-ad-content />
  </div>;
}

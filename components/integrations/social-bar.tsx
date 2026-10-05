"use client";

import { useEffect } from "react";
import { adsterra } from "@/config/adsterra";

const scriptId = "adsterra-social-bar";

export function SocialBar() {
  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (disposed || document.getElementById(scriptId)) return;
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = adsterra.socialScriptUrl;
      document.body.appendChild(script);
    });
    // Keep the document-wide script across client navigation. Root layout
    // persists, and the script id also guards any later remount.
    return () => { disposed = true; };
  }, []);
  return null;
}

import { adsterra } from "@/config/adsterra";
import { NativeAdClient } from "./native-ad-client";

export function NativeAdSlot() {
  return (
    <NativeAdClient
      scriptUrl={adsterra.nativeScriptUrl}
      containerId={adsterra.nativeContainerId}
    />
  );
}

import { integrations } from "@/config/integrations";

export function Analytics() {
  if (integrations.analytics.provider !== "google-analytics") return null;
  const measurementId = integrations.analytics.measurementId;

  return (
    <>
      <script
        id="google-analytics-loader"
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <script id="google-analytics" dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        ` }} />
    </>
  );
}

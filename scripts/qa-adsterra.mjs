// Real browser requests only. This check never routes, fulfills or mocks ads.
// Usage: npm run qa:ads -- [URL] [label] [--lifecycle-only]
import { spawnSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const url = process.argv[2] || "https://dream-car-collection.github.io/";
const label = (process.argv[3] || "production").replace(/[^a-z0-9-]/gi, "-");
const output = resolve("output/playwright");
const cli = process.env.ADSTERRA_PLAYWRIGHT_CLI || join(homedir(), ".codex/skills/playwright/scripts/playwright_cli.sh");
const session = `adsterra-${label}`;
mkdirSync(output, { recursive: true });
let commandNumber = 0;
let structuralChecksPassed = true;

function run(...args) {
  // The CLI starts a persistent browser daemon. A log file prevents an inherited
  // stdout pipe from keeping spawnSync open after the CLI itself has exited.
  const log = join(output, `${label}-command-${process.pid}-${++commandNumber}.log`);
  const fd = openSync(log, "w");
  let result;
  try {
    result = spawnSync(cli, [`-s=${session}`, ...args], { stdio: ["ignore", fd, fd], timeout: 60000 });
  } finally {
    closeSync(fd);
  }
  const raw = readFileSync(log, "utf8");
  if (result.error || result.status !== 0 || raw.includes("### Error")) {
    throw new Error(result.error?.message || raw);
  }
  return raw;
}

async function inspect(page, options) {
  const probe = await page.context().newPage();
  await probe.setViewportSize({ width: options.width, height: 1000 });
  const requests = [];
  const responses = [];
  const failures = [];
  const consoleMessages = [];
  const jsErrors = [];
  const browserBlocks = [];
  const securityHeaders = ["content-security-policy", "content-security-policy-report-only", "referrer-policy", "x-frame-options", "cross-origin-opener-policy", "cross-origin-embedder-policy", "cross-origin-resource-policy"];
  const official = {
    desktop: "https://bauval.org/22/939ec9ea4397bc6830aac8d12e33f5ae",
    mobile: "https://bauval.org/22/30d53fccfc4b6dd440b03328f431155f",
    native: "https://bauval.org/21/57a0e4afcad84c59e38ca6ace4b65e6a",
    social: "https://bauval.org/14/c36f007ec75a28ac4f043cc5616b6947",
  };
  const rootUrl = request => {
    while (request.redirectedFrom()) request = request.redirectedFrom();
    return request.url();
  };
  const adRequest = request => /bauval\.org|highrevenueformat\.com|profitableratecpmnetwork\.com/.test(rootUrl(request)) || Object.values(official).some(src => rootUrl(request).includes(src.split("/").pop()));
  probe.on("request", request => {
    if (adRequest(request)) requests.push({ url: request.url(), originalUrl: rootUrl(request), type: request.resourceType(), frameUrl: request.frame().url() });
  });
  probe.on("response", response => {
    if (adRequest(response.request())) responses.push({ url: response.url(), originalUrl: rootUrl(response.request()), status: response.status(), redirectedFrom: response.request().redirectedFrom()?.url() || null, location: response.headers().location || null, contentLength: response.headers()["content-length"] ?? null });
  });
  probe.on("requestfailed", request => {
    failures.push({ url: request.url(), originalUrl: rootUrl(request), error: request.failure()?.errorText || "unknown" });
  });
  probe.on("console", message => {
    if (["error", "warning"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() });
  });
  probe.on("pageerror", error => jsErrors.push({ message: error.message, stack: error.stack }));
  const cdp = await probe.context().newCDPSession(probe);
  await cdp.send("Network.enable");
  cdp.on("Network.loadingFailed", event => {
    browserBlocks.push({ type: event.type, error: event.errorText, blockedReason: event.blockedReason || null, corsErrorStatus: event.corsErrorStatus || null, canceled: event.canceled });
  });
  try {
    const documentResponse = await probe.goto(options.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    // A visible native placement allows lazy provider code to run naturally.
    const native = probe.locator("[data-native-ad-slot]").first();
    if (await native.count()) await native.scrollIntoViewIfNeeded();
    await probe.waitForTimeout(20000);
    const dom = await probe.evaluate(() => ({
      title: document.title,
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      adScripts: [...document.querySelectorAll("script[src]")].filter(script => /bauval\.org|highrevenueformat\.com|profitableratecpmnetwork\.com/.test(script.src)).map(script => ({ id: script.id, src: script.src, async: script.getAttribute("async"), cfasync: script.getAttribute("data-cfasync") })),
      bannerSlots: document.querySelectorAll("[data-banner-ad-slot]").length,
      nativeContainers: document.querySelectorAll('[id="container-57a0e4afcad84c59e38ca6ace4b65e6a"]').length,
      slots: [...document.querySelectorAll("[data-banner-ad-slot], [data-native-ad-slot]")].map(slot => ({ status: slot.dataset.status, size: slot.dataset.size, height: slot.getBoundingClientRect().height, scripts: [...slot.querySelectorAll("script[src]")].map(script => script.src), iframes: [...slot.querySelectorAll("iframe")].map(frame => ({ src: frame.src, width: frame.getBoundingClientRect().width, height: frame.getBoundingClientRect().height })) })),
      intermediateFrames: [...document.querySelectorAll("iframe")].filter(frame => /\/adsterra\/banner-/.test(frame.src)).length,
    }));
    const chains = Object.fromEntries(Object.entries(official).map(([name, src]) => {
      const chain = responses.filter(response => response.originalUrl === src);
      const last = chain.at(-1);
      return [name, { originalUrl: src, requestCount: requests.filter(request => request.url === src).length, initialStatus: chain[0]?.status ?? null, redirected: chain.length > 1 || !!chain[0]?.location, finalUrl: last?.url ?? null, finalStatus: last?.status ?? null, failures: failures.filter(failure => failure.originalUrl === src) }];
    }));
    await probe.screenshot({ path: options.screenshot, fullPage: true });
    return {
      mode: "real-network-no-mocking", testedAt: new Date().toISOString(), url: options.url, width: options.width,
      documentStatus: documentResponse?.status(), securityHeaders: Object.fromEntries(securityHeaders.map(name => [name, documentResponse?.headers()[name] || null])),
      chains, requests, responses, failures, browserBlocks, consoleMessages, jsErrors, dom,
      checks: {
        correctBannerOnly: chains[options.width >= 768 ? "desktop" : "mobile"].requestCount === 1 && chains[options.width >= 768 ? "mobile" : "desktop"].requestCount === 0,
        nativeOnce: chains.native.requestCount === 1 && dom.nativeContainers === 1,
        socialOnce: chains.social.requestCount === 1 && dom.adScripts.filter(script => script.src === official.social && script.cfasync === "false").length === 1,
        noIntermediateFrames: dom.intermediateFrames === 0,
        noHorizontalOverflow: !dom.overflow,
        noPageJsErrors: jsErrors.length === 0,
      },
      // Even an HTTP 200 or an iframe does not establish dashboard accounting.
      dashboardRequestOrImpressionConfirmed: false,
    };
  } finally {
    await cdp.detach();
    await probe.close();
  }
}

async function inspectLifecycle(page, url) {
  const probe = await page.context().newPage();
  const requests = [];
  const jsErrors = [];
  probe.on("request", request => {
    if (request.url().startsWith("https://bauval.org/")) requests.push(request.url());
  });
  probe.on("pageerror", error => jsErrors.push(error.message));
  const snapshots = [];
  try {
    await probe.setViewportSize({ width: 1440, height: 1000 });
    await probe.goto(url, { waitUntil: "domcontentloaded" });
    const capture = async action => {
      await probe.waitForFunction(() => document.getElementById("adsterra-responsive-banner") && document.getElementById("adsterra-native") && document.getElementById("adsterra-social-bar"));
      await probe.waitForTimeout(500);
      snapshots.push({ action, ...await probe.evaluate(() => ({
        pathname: location.pathname, viewport: innerWidth,
        bannerScripts: document.querySelectorAll("[data-adsterra-desktop], [data-adsterra-mobile]").length,
        nativeScripts: document.querySelectorAll("[data-adsterra-native]").length,
        nativeContainers: document.querySelectorAll('[id="container-57a0e4afcad84c59e38ca6ace4b65e6a"]').length,
        socialScripts: document.querySelectorAll("[data-adsterra-social]").length,
        bannerSize: document.querySelector("[data-banner-ad-slot]")?.dataset.size,
        options: window.atOptions,
        intermediateFrames: [...document.querySelectorAll("iframe")].filter(frame => /\/adsterra\/banner-/.test(frame.src)).length,
      })), requestCount: requests.length });
    };
    await capture("home");
    const social = await probe.locator("#adsterra-social-bar").elementHandle();
    const previousBanner = await probe.locator("#adsterra-responsive-banner").elementHandle();
    const previousNative = await probe.locator('[id="container-57a0e4afcad84c59e38ca6ace4b65e6a"]').elementHandle();
    const beforeResize = requests.length;
    for (const width of [375, 1440, 375, 1440]) await probe.setViewportSize({ width, height: 1000 });
    await capture("rapid resize across 768px");
    const resizeDidNotReinitialize = requests.length === beforeResize;
    await probe.locator('header a[href="/codes/"]').first().click();
    await capture("client route to codes");
    const previousPageCleaned = await previousBanner.evaluate(node => !node.isConnected) && await previousNative.evaluate(node => !node.isConnected);
    await probe.locator('header a[href="/how-to-play/"]').first().click();
    await capture("client route to how-to-play");
    await probe.goBack();
    await capture("back to codes");
    await probe.goForward();
    await capture("forward to how-to-play");
    await probe.setViewportSize({ width: 375, height: 1000 });
    await probe.locator('header a[href="/"]').first().click();
    await capture("new page initialized at mobile width");
    const socialPersisted = await social.evaluate(node => node.isConnected && node === document.getElementById("adsterra-social-bar"));
    return { mode: "real-network-no-mocking", snapshots, requests, jsErrors, checks: {
      oneInstancePerFormat: snapshots.every(snapshot => snapshot.bannerScripts === 1 && snapshot.nativeScripts === 1 && snapshot.nativeContainers === 1 && snapshot.socialScripts === 1 && snapshot.intermediateFrames === 0),
      previousPageCleaned, resizeDidNotReinitialize, socialPersisted,
      socialRequestedOnce: requests.filter(request => request.includes("/14/")).length === 1,
      oneBannerAndNativePerVisit: requests.filter(request => request.includes("/22/")).length === 6 && requests.filter(request => request.includes("/21/")).length === 6,
      mobileOnNewPage: snapshots.at(-1).bannerSize === "320x50",
      noPageJsErrors: jsErrors.length === 0,
    } };
  } finally {
    await probe.close();
  }
}

function readResult(raw) {
  const match = raw.match(/### Result\n([\s\S]*?)\n### Ran Playwright code/);
  if (!match) throw new Error("Playwright did not return a QA result");
  return JSON.parse(match[1]);
}

run("open", "about:blank", "--headed");
try {
  for (const width of process.argv.includes("--lifecycle-only") ? [] : [1440, 375]) {
    const options = { url, width, screenshot: join(output, `${label}-${width}.png`) };
    const raw = run("run-code", `async (page) => await (${inspect.toString()})(page, ${JSON.stringify(options)})`);
    writeFileSync(join(output, `${label}-${width}-cli.log`), raw);
    const report = readResult(raw);
    writeFileSync(join(output, `${label}-${width}.json`), JSON.stringify(report, null, 2) + "\n");
    structuralChecksPassed &&= Object.values(report.checks).every(Boolean);
    console.log(JSON.stringify({ width, chains: report.chains, checks: report.checks, jsErrors: report.jsErrors, output: join(output, `${label}-${width}.json`) }, null, 2));
  }
  if (["127.0.0.1", "localhost"].includes(new URL(url).hostname) || process.argv.includes("--lifecycle-only")) {
    const report = readResult(run("run-code", `async (page) => await (${inspectLifecycle.toString()})(page, ${JSON.stringify(url)})`));
    writeFileSync(join(output, `${label}-lifecycle.json`), JSON.stringify(report, null, 2) + "\n");
    structuralChecksPassed &&= Object.values(report.checks).every(Boolean);
    console.log(JSON.stringify({ lifecycle: report.checks, output: join(output, `${label}-lifecycle.json`) }, null, 2));
  }
} finally {
  run("close");
}
// This exit status covers integration structure, not fill or dashboard totals.
process.exitCode = structuralChecksPassed ? 0 : 1;

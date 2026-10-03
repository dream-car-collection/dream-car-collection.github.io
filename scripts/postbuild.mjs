import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

const root = process.cwd();
const output = join(root, "out");
const publicDir = join(root, "public");

writeFileSync(join(output, ".nojekyll"), "", "utf8");

const customDomain = process.env.NEXT_PUBLIC_CUSTOM_DOMAIN?.trim();
if (customDomain) writeFileSync(join(output, "CNAME"), `${customDomain}\n`, "utf8");

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const absolute = join(directory, name);
    return statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
  });
}

/** Keep the Google tag first in each exported head despite framework resource hoisting. */
function positionGoogleTag() {
  for (const path of walk(output).filter((path) => path.endsWith(".html"))) {
    const html = readFileSync(path, "utf8");
    const loader = html.match(/<script\b[^>]*\bid="google-analytics-loader"[^>]*>[\s\S]*?<\/script>/g) ?? [];
    const config = html.match(/<script\b[^>]*\bid="google-analytics"[^>]*>[\s\S]*?<\/script>/g) ?? [];
    if (!loader.length && !config.length) continue;
    if (loader.length !== 1 || config.length !== 1) throw new Error(`Expected one Google tag in ${relative(output, path)}`);
    const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1];
    if (!head?.includes(loader[0]) || !head.includes(config[0])) throw new Error("Google tag must be inside head");
    const rest = head.replace(loader[0], "").replace(config[0], "");
    writeFileSync(path, html.replace(`<head>${head}</head>`, `<head>${loader[0]}${config[0]}${rest}</head>`), "utf8");
  }
}

/** Ensure technical verification files from public/ are present at the build output root. */
function ensureTechnicalPublicFiles() {
  if (!existsSync(publicDir) || !existsSync(output)) return [];
  const copied = [];
  for (const absolute of walk(publicDir)) {
    const local = relative(publicDir, absolute).split(sep).join("/");
    const base = local.split("/").pop() || "";
    const technical = /^google[a-z0-9_-]*\.html$/i.test(base)
      || /^(robots\.txt|ads\.txt)$/i.test(base)
      || local.startsWith(".well-known/");
    if (!technical) continue;
    const target = join(output, local);
    mkdirSync(dirname(target), { recursive: true });
    if (!existsSync(target)) {
      copyFileSync(absolute, target);
      copied.push(local);
    }
  }
  return copied;
}

positionGoogleTag();
const ensured = ensureTechnicalPublicFiles();
console.log(
  customDomain
    ? `Static output prepared with CNAME ${customDomain}.`
    : "Static output prepared for GitHub Pages.",
);
if (ensured.length) {
  console.log(`Ensured technical public files in out/: ${ensured.join(", ")}`);
}

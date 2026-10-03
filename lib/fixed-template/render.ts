import { accentOverrideCss, resolveAccent, templatePack, type TemplateSkin } from "./catalog";
import { SPEC_HTML } from "./spec-html";

export interface TemplateLink {
  slug: string;
  label: string;
  href: string;
}

export interface TemplateEntry {
  href: string;
  title: string;
  text: string;
}

export interface FixedTemplateInput {
  skin: TemplateSkin | string;
  page: "home" | "inner";
  accentColorId?: string | null;
  gameName: string;
  nav: TemplateLink[];
  currentSlug?: string | null;
  homeHref: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  heading?: string | null;
  lead?: string | null;
  /** Real SEO body. Replaces the approved inner article demo. */
  articleHtml?: string | null;
  /** Real pages. Replaces demo cards on the home template. */
  entries?: TemplateEntry[] | null;
  /** Extra real copy appended inside <main>, after the approved structure. */
  supplementHtml?: string | null;
}

export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function templateNavLinks(nav: TemplateLink[], page: "home" | "inner", currentSlug?: string | null): string {
  const items = nav.filter((item) => item.slug.replace(/^\/+|\/+$/g, ""));
  return items.map((item) => {
    const slug = item.slug.replace(/^\/+|\/+$/g, "");
    const active = page === "inner" && currentSlug && slug === currentSlug.replace(/^\/+|\/+$/g, "");
    return `<a class="nav-link${active ? " active" : ""}" href="${esc(item.href)}">${esc(item.label)}</a>`;
  }).join("");
}

function brandInner(gameName: string, skin: string, page: "home" | "inner", logoUrl?: string | null): string {
  const logo = logoUrl
    ? `<img alt="" src="${esc(logoUrl)}" style="height:28px;width:28px;object-fit:cover;vertical-align:middle;margin-right:8px">`
    : "";
  if (skin === "resource") {
    const tag = page === "home" ? "<small>GAME RESOURCE CENTER</small>" : "";
    return `${logo}${esc(gameName)}${tag}`;
  }
  const parts = gameName.trim().split(/\s+/).filter(Boolean);
  const tag = skin === "horror" ? "i" : "span";
  if (parts.length < 2) return `${logo}${esc(gameName)}`;
  const last = esc(parts[parts.length - 1] ?? "");
  const rest = esc(parts.slice(0, -1).join(" "));
  return `${logo}${rest}<${tag}>${last}</${tag}>`;
}

function replaceNav(html: string, links: string): string {
  if (html.includes('<nav class="wrap nav">')) {
    return html.replace(/<nav class="wrap nav">[\s\S]*?<\/nav>/, `<nav class="wrap nav">${links}</nav>`);
  }
  if (html.includes('<div class="nav">')) {
    return html.replace(/<div class="nav">[\s\S]*?<\/div>/, `<div class="nav">${links}</div>`);
  }
  return html.replace(/<nav class="nav">[\s\S]*?<\/nav>/, `<nav class="nav">${links}</nav>`);
}

function replaceBrand(html: string, inner: string, homeHref: string): string {
  return html.replace(
    /<a class="(brand|logo)" href="home\.html" aria-label="Back to homepage">[\s\S]*?<\/a>/,
    `<a class="$1" href="${esc(homeHref)}" aria-label="Back to homepage">${inner}</a>`,
  );
}

function replaceCrumbs(html: string, homeHref: string, current: string | null): string {
  const body = current
    ? `<a href="${esc(homeHref)}">Home</a> › ${esc(current)}`
    : `<a href="${esc(homeHref)}">Home</a>`;
  return html
    .replace(/<div class="site-breadcrumb">[\s\S]*?<\/div>/g, `<div class="site-breadcrumb">${body}</div>`)
    .replace(/<div class="crumb">[\s\S]*?<\/div>/g, `<div class="crumb">${body}</div>`);
}

function replaceBalanced(html: string, tag: string, className: string, inner: string): string {
  const marker = `<${tag} class="${className}">`;
  const start = html.indexOf(marker);
  if (start < 0) return html;
  const openEnd = start + marker.length;
  const closer = `</${tag}>`;
  let depth = 1;
  let index = openEnd;
  while (index < html.length && depth > 0) {
    const nextOpen = html.indexOf(`<${tag}`, index);
    const nextClose = html.indexOf(closer, index);
    if (nextClose < 0) return html;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      index = nextOpen + tag.length + 1;
    } else {
      depth -= 1;
      if (depth === 0) return `${html.slice(0, openEnd)}${inner}${html.slice(nextClose)}`;
      index = nextClose + closer.length;
    }
  }
  return html;
}

function applyEntries(html: string, skin: string, entries: TemplateEntry[]): string {
  const cards = entries.map((entry, index) => {
    const title = esc(entry.title);
    const text = esc(entry.text);
    const href = esc(entry.href);
    if (skin === "portal") return `<a class="card" href="${href}"><div class="icon">${index + 1}</div><h3>${title}</h3><p>${text}</p></a>`;
    if (skin === "wiki") return `<a class="row" href="${href}"><b>${title}</b><span>${text}</span></a>`;
    if (skin === "editorial") {
      return `<article class="article"><a href="${href}"><div class="thumb"></div><div class="article-body"><h3>${title}</h3><p>${text}</p></div></a></article>`;
    }
    if (skin === "glass") {
      return `<a class="block" href="${href}"><div class="num">0${index + 1}</div><b>${title}</b><p>${text}</p></a>`;
    }
    if (skin === "pixel") return `<a class="tile" href="${href}"><div class="icon">▣</div><b>${title}</b><p>${text}</p></a>`;
    if (skin === "horror") return `<article class="card"><a href="${href}"><div class="tag">GUIDE</div><h3>${title}</h3><p>${text}</p></a></article>`;
    return `<a class="quick" href="${href}"><b>${title}</b><span>${text}</span></a>`;
  }).join("");
  if (skin === "portal") return replaceBalanced(html, "div", "grid", cards);
  if (skin === "wiki") return replaceBalanced(html, "div", "list", cards);
  if (skin === "resource") return replaceBalanced(html, "div", "quick-grid", cards);
  if (skin === "editorial") return replaceBalanced(html, "section", "grid", cards);
  if (skin === "glass") return replaceBalanced(html, "div", "blocks", cards);
  if (skin === "pixel") return replaceBalanced(html, "div", "tiles", cards);
  if (skin === "horror") return replaceBalanced(html, "div", "cards", cards);
  return html;
}

function insertBanner(html: string, bannerUrl: string): string {
  const img = `<img alt="" src="${esc(bannerUrl)}" style="width:100%;height:180px;object-fit:cover;display:block">`;
  if (html.includes('<div class="visual">')) return html.replace('<div class="visual">', `<div class="visual">${img}`);
  if (html.includes('<header class="hero-wrap">')) return html.replace('<header class="hero-wrap">', `<header class="hero-wrap">${img}`);
  if (html.includes('<article class="lead-card">')) return html.replace('<article class="lead-card">', `<article class="lead-card">${img}`);
  if (html.includes('<section class="hero">')) return html.replace('<section class="hero">', `<section class="hero">${img}`);
  if (html.includes('<section class="panel hero">')) return html.replace('<section class="panel hero">', `<section class="panel hero">${img}`);
  return html;
}

function applyCopy(html: string, input: FixedTemplateInput): string {
  let next = html.replaceAll("Riftfall Survival", input.gameName);
  if (input.heading) next = next.replace(/<h1>[\s\S]*?<\/h1>/, `<h1>${esc(input.heading)}</h1>`);
  if (input.lead) {
    if (next.includes('<p class="lead">')) next = next.replace(/<p class="lead">[\s\S]*?<\/p>/, `<p class="lead">${esc(input.lead)}</p>`);
    else if (next.includes('<p class="deck">')) next = next.replace(/<p class="deck">[\s\S]*?<\/p>/, `<p class="deck">${esc(input.lead)}</p>`);
  }
  return next;
}

export function renderFixedTemplate(input: FixedTemplateInput): string {
  const pack = templatePack(input.skin);
  const source = SPEC_HTML[pack.specId]?.[input.page];
  if (!source) throw new Error(`Missing approved HTML for ${pack.specId} ${input.page}`);
  const paint = resolveAccent(pack.skin, input.accentColorId);
  const currentLabel = input.page === "inner"
    ? (input.nav.find((item) => item.slug.replace(/^\/+|\/+$/g, "") === (input.currentSlug || "").replace(/^\/+|\/+$/g, ""))?.label || input.heading || "Guide")
    : null;
  let html = source;
  html = replaceBrand(html, brandInner(input.gameName, pack.skin, input.page, input.logoUrl), input.homeHref);
  html = html.replaceAll('href="home.html"', `href="${esc(input.homeHref)}"`);
  html = replaceNav(html, templateNavLinks(input.nav, input.page, input.currentSlug));
  html = replaceCrumbs(html, input.homeHref, currentLabel);
  html = html.replace(/href="inner\.html#([^"]+)"/g, (_match, id: string) => {
    const linked = input.nav.find((item) => item.slug.replace(/^\/+|\/+$/g, "") === id);
    return `href="${esc(linked?.href || `#${id}`)}"`;
  });
  if (input.bannerUrl) html = insertBanner(html, input.bannerUrl);
  if (input.page === "home" && input.entries) html = applyEntries(html, pack.skin, input.entries);
  if (input.page === "inner" && input.articleHtml) {
    html = replaceArticleBody(html, input.articleHtml);
    html = syncAside(html, input.articleHtml);
  }
  if (input.supplementHtml) html = html.replace("</main>", `${input.supplementHtml}</main>`);
  html = applyCopy(html, input);
  html = html.replace(/--accent:#[0-9A-Fa-f]{6}/, `--accent:${paint.textAccent}`);
  html = html.replace("</style>", `${accentOverrideCss(pack.skin, paint)}</style>`);
  return html;
}

function syncAside(html: string, articleHtml: string): string {
  const sections = [...articleHtml.matchAll(/<section id="([^"]+)">\s*<h2>([\s\S]*?)<\/h2>/g)];
  if (!sections.length || !html.includes("<aside")) return html;
  const links = sections.map((match) => `<a href="#${match[1]}">${match[2]}</a>`).join("");
  return html.replace(/<aside([^>]*)>([\s\S]*?)<\/aside>/, (_full, attrs: string, inner: string) => {
    let used = false;
    const next = inner.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, () => {
      if (used) return "";
      used = true;
      return links;
    });
    return `<aside${attrs}>${used ? next : `${inner}${links}`}</aside>`;
  });
}

function replaceArticleBody(html: string, articleHtml: string): string {
  const match = html.match(/<article([^>]*)>([\s\S]*?)<\/article>/);
  if (!match) return html;
  const inner = match[2] ?? "";
  const crumb = inner.match(/<div class="(?:crumb|site-breadcrumb)">[\s\S]*?<\/div>/);
  const h1 = inner.match(/<h1>[\s\S]*?<\/h1>/);
  return html.replace(match[0], `<article${match[1] ?? ""}>${crumb?.[0] ?? ""}${h1?.[0] ?? ""}${articleHtml}</article>`);
}

export function extractStyle(html: string): string {
  return [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1] ?? "").join("\n");
}

export function extractBody(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return (match?.[1] ?? html).replace(/<script[\s\S]*?<\/script>/g, "");
}

export function splitFixedChrome(body: string, skin: string): { chrome: string; rest: string } {
  const source = body.trim();
  const pattern = skin === "editorial"
    ? /^<div class="topline">[\s\S]*?<\/header>/
    : skin === "resource"
      ? /^<header[\s\S]*?<\/header>\s*<div class="navbar">[\s\S]*?<\/div>/
      : skin === "glass"
        ? /^<nav class="floating">[\s\S]*?<\/nav>/
        : /^<header[\s\S]*?<\/header>/;
  const match = source.match(pattern);
  if (!match) return { chrome: "", rest: source };
  return { chrome: match[0], rest: source.slice(match[0].length) };
}

function scopeSelectorList(selector: string, scope: string): string {
  return selector.split(",").map((part) => {
    const sel = part.trim();
    if (!sel || sel.startsWith("@")) return sel;
    if (sel === ":root" || sel === "html" || sel === "body") return scope;
    return `${scope} ${sel}`;
  }).join(",");
}

export function scopeTemplateCss(css: string, scope: string): string {
  let index = 0;
  let out = "";
  const source = css.trim();
  while (index < source.length) {
    while (source[index] === " " || source[index] === "\n") index += 1;
    if (index >= source.length) break;
    if (source.startsWith("@media", index) || source.startsWith("@supports", index)) {
      const brace = source.indexOf("{", index);
      if (brace < 0) break;
      const header = source.slice(index, brace + 1);
      let depth = 1;
      let cursor = brace + 1;
      while (cursor < source.length && depth > 0) {
        if (source[cursor] === "{") depth += 1;
        else if (source[cursor] === "}") depth -= 1;
        cursor += 1;
      }
      const inner = source.slice(brace + 1, cursor - 1);
      out += `${header}${scopeTemplateCss(inner, scope)}}`;
      index = cursor;
      continue;
    }
    const brace = source.indexOf("{", index);
    if (brace < 0) break;
    const selector = source.slice(index, brace).trim();
    const close = source.indexOf("}", brace);
    if (close < 0) break;
    const body = source.slice(brace + 1, close);
    out += `${scopeSelectorList(selector, scope)}{${body}}`;
    index = close + 1;
  }
  return out;
}

export function scopedTemplateCss(skin: string, accentColorId?: string | null): string {
  const pack = templatePack(skin);
  const home = SPEC_HTML[pack.specId]?.home ?? "";
  const inner = SPEC_HTML[pack.specId]?.inner ?? "";
  const paint = resolveAccent(pack.skin, accentColorId);
  const raw = `${extractStyle(home)}\n${extractStyle(inner)}\n${accentOverrideCss(pack.skin, paint)}`;
  return scopeTemplateCss(raw, `body[data-fixed-template="${pack.skin}"]`);
}

export function renderFixedDocument(input: FixedTemplateInput): { html: string; body: string; chrome: string; rest: string } {
  const html = renderFixedTemplate(input);
  const body = extractBody(html);
  const parts = splitFixedChrome(body, templatePack(input.skin).skin);
  return { html, body, ...parts };
}

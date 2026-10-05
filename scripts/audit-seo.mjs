import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { validate, coreSlugs, productionOrigin, forbidden, readJson } from './validate-content.mjs';

const prelaunch = process.argv.includes('--prelaunch');
const gaId = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || readJson('integrations').gaMeasurementId || '').toUpperCase();
const { home, pages } = validate({ prelaunch });
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map(m => attrs(m[0]));
const text = html => decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' '));
const read = p => readFileSync(join('out', p), 'utf8');
const titles = new Set();
const descriptions = new Set();
for (const p of [home, ...pages]) {
  const filename = p.slug ? `${p.slug}/index.html` : 'index.html';
  assert(existsSync(join('out', filename)), `${filename} exists`);
  const html = read(filename);
  const titleMatches = [...html.matchAll(/<title>(.*?)<\/title>/g)];
  assert.equal(titleMatches.length, 1, `${filename}: one title`);
  const title = decode(titleMatches[0][1]);
  assert.equal(title, p.title, `${filename}: exact title`);
  assert(!titles.has(title)); titles.add(title);
  const meta = tags(html, 'meta');
  const description = meta.filter(m => m.name === 'description');
  assert.equal(description.length, 1);
  assert.equal(description[0].content, p.description);
  assert(!descriptions.has(p.description)); descriptions.add(p.description);
  const canonical = tags(html, 'link').filter(l => l.rel === 'canonical');
  const url = `${productionOrigin}/${p.slug ? p.slug+'/' : ''}`;
  assert.equal(canonical.length, 1); assert.equal(canonical[0].href, url);
  assert.equal(meta.find(m => m.name === 'robots')?.content, prelaunch ? 'noindex, nofollow' : 'index, follow');
  for (const [property, expected] of [['og:title', p.title], ['og:description',p.description],['og:url',url]]) assert.equal(meta.find(m => m.property === property)?.content, expected);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert((html.match(/<h2\b/g) ?? []).length > 0);
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
  assert(main && text(main).match(/[a-z]+/gi).length > 700, `${filename}: substantial visible English content`);
  for (const region of ['header', 'footer']) {
    const block = html.match(new RegExp(`<${region}\\b[^>]*>([\\s\\S]*?)<\\/${region}>`))?.[1] ?? '';
    const hrefs = tags(block, 'a').map(a => a.href);
    for (const slug of coreSlugs) assert(hrefs.includes(`/${slug}/`), `${filename}: ${region} links to ${slug}`);
  }
  const links = tags(main, 'a');
  if (p.slug) {
    assert(links.some(a => a.href === '/'), 'Breadcrumb home link');
    for (const related of p.relatedSlugs) assert(links.some(a => a.href === `/${related}/`), 'Related link');
  } else for (const slug of coreSlugs) assert(links.some(a => a.href === `/${slug}/`), 'Homepage entry');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  for (const { href } of tags(html, 'a')) {
    if (href?.startsWith('#')) assert(ids.has(href.slice(1)), `${filename}: live anchor ${href}`);
    if (href?.startsWith('/') && !href.startsWith('//')) assert(existsSync(join('out', href.endsWith('/') ? `${href}index.html` : href)), `Live internal path ${href}`);
  }
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => JSON.parse(m[1]));
  const schemaTypes = schemas.map(s => s['@type']);
  for (const type of p.slug ? ['WebPage', 'BreadcrumbList','FAQPage'] : ['WebSite','VideoGame','FAQPage']) assert(schemaTypes.includes(type), `${filename}: ${type}`);
  assert(!schemaTypes.some(t => ['Review','AggregateRating','Product','ItemList'].includes(t)));
  console.log(`PASS ${url}`);
}
const sitemap = read('sitemap.xml');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
assert.deepEqual(urls.sort(), [home,...pages].map(p => `${productionOrigin}/${p.slug ? p.slug+'/' : ''}`).sort());
assert(!existsSync('out/wiki/index.html'));
assert(!existsSync('out/contact/index.html'));
assert(!existsSync('out/CNAME'));
const robots = read('robots.txt');
assert(robots.includes(prelaunch ? 'Disallow: /' : 'Allow: /'));
if (!prelaunch) assert(!robots.includes('Disallow: /'));
assert(robots.includes(`Sitemap: ${productionOrigin}/sitemap.xml`));
for (const slug of ['about','privacy','terms','copyright']) assert(tags(read(`${slug}/index.html`),'meta').find(m => m.name === 'robots')?.content.includes('noindex'));
assert(tags(read('404.html'),'meta').find(m => m.name === 'robots')?.content.includes('noindex'));
function walk(dir) { return readdirSync(dir).flatMap(name => { const path = join(dir,name); return statSync(path).isDirectory() ? walk(path) : [path]; }); }
for (const path of walk('out').filter(p => /\.(html|txt|xml|svg|webmanifest)$/.test(p))) {
  const raw = readFileSync(path,'utf8');
  // Banner iframe documents are technical assets, not site page views.
  const bannerAsset = /^out\/adsterra\/banner-(desktop|mobile)\.html$/.test(path);
  if (bannerAsset) {
    assert.equal(raw, readFileSync(path.replace(/^out\//, 'public/'), 'utf8'), `${path}: official banner document copied intact`);
    assert(tags(raw, 'meta').find(m => m.name === 'robots')?.content.includes('noindex'), `${path}: technical asset is noindex`);
  }
  if (path.endsWith('.html') && !bannerAsset && /^G-[A-Z0-9]+$/.test(gaId)) {
    const head = raw.match(/<head>([\s\S]*?)<\/head>/)?.[1];
    assert(head, `${path}: head exists`);
    const loaders = tags(raw, 'script').filter(s => s.src?.startsWith('https://www.googletagmanager.com/gtag/js'));
    assert.equal(loaders.length, 1, `${path}: one Google tag loader`);
    assert.equal(loaders[0].src, `https://www.googletagmanager.com/gtag/js?id=${gaId}`);
    assert('async' in loaders[0], `${path}: async loader`);
    const configs = [...raw.matchAll(/<script\b[^>]*\bid="google-analytics"[^>]*>([\s\S]*?)<\/script>/g)];
    assert.equal(configs.length, 1, `${path}: one Google tag initialization`);
    assert(configs[0][1].includes(`gtag('config', '${gaId}');`), `${path}: correct GA property`);
    assert(head.startsWith('<script id="google-analytics-loader"'), `${path}: Google tag immediately after head`);
    assert(head.includes(configs[0][0]), `${path}: initialization inside head`);
  }
  assert(!forbidden.test(raw), `${path}: no output residue`);
  assert(!raw.includes('dream-car-collection.github.io/dream-car-collection/'), `${path}: no wrong base path`);
}
console.log(`SEO audit PASS (${prelaunch ? 'prelaunch' : 'production'}): exact metadata, routes, navigation, schema, legal, sitemap, robots, and residue.`);

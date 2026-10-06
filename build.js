#!/usr/bin/env node
/**
 * build.js — Static site generator for the Ibrahim Khan personal brand site.
 *
 * What it does:
 *  1. Reads Markdown + YAML front matter from /content (settings, home, services,
 *     projects, faq, blog) using gray-matter + marked.
 *  2. Generates static HTML into /dist:
 *     home (/), /services/, /projects/, /blog/, /blog/<slug>/, /tags/<tag>/,
 *     /privacy/, /thank-you/, /404.html
 *  3. Generates sitemap.xml, robots.txt, rss.xml, llms.txt, _headers, _redirects.
 *  4. Injects per-page <title>, meta description, canonical, Open Graph + Twitter cards.
 *  5. Injects JSON-LD: Person, ProfessionalService, WebSite, FAQPage, BlogPosting.
 *  6. Calculates reading time, builds a table of contents per post, related posts.
 *
 * Usage:  npm install  →  npm run build  →  output in /dist
 * Requires Node 18+. Dependencies: marked, gray-matter (see package.json).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

/* ---------------- config ---------------- */
const ROOT = __dirname;
const CONTENT = path.join(ROOT, 'content');
const DIST = path.join(ROOT, 'dist');

function loadFile(rel) {
  const raw = fs.readFileSync(path.join(CONTENT, rel), 'utf8');
  return matter(raw);
}
function loadDir(rel) {
  const dir = path.join(CONTENT, rel);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => {
    const m = loadFile(path.join(rel, f));
    return { ...m.data, body: m.content, file: f, slug: m.data.slug || f.replace(/\.md$/, '') };
  });
}

const settings = loadFile('settings.md').data;
const home = loadFile('home.md').data;
const services = loadDir('services').sort((a, b) => (a.order || 99) - (b.order || 99));
const projects = loadDir('projects').sort((a, b) => (a.order || 99) - (b.order || 99));
const faqs = loadDir('faq').sort((a, b) => (a.order || 99) - (b.order || 99));
const posts = loadDir('blog')
  .filter(p => !p.draft)
  .sort((a, b) => new Date(b.date) - new Date(a.date));

const SITE = settings.site_url.replace(/\/$/, '');
const NAME = settings.name;
const WA = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(settings.whatsapp_text)}`;
const OG_IMG = `${SITE}/assets/img/og-image.png`;

marked.setOptions({ gfm: true, breaks: false });

/* ---------------- helpers ---------------- */
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stripMd = md => md.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[#>*_`|-]/g, ' ').replace(/\s+/g, ' ').trim();

const readingTime = md => Math.max(1, Math.ceil(stripMd(md).split(' ').length / 200));

const fmtDate = d => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
const isoDate = d => new Date(d).toISOString().slice(0, 10);
const fmtDateRfc = d => d.toISOString();
const slugify = s => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Add ids to h2/h3 and collect TOC entries. */
function withToc(html) {
  const toc = [];
  const out = html.replace(/<h([23])>(.*?)<\/h\1>/g, (m, lvl, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    const id = slugify(text);
    toc.push({ level: +lvl, id, text });
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
  });
  return { html: out, toc };
}

function relatedPosts(post, all, n = 3) {
  const tags = post.tags || [];
  return all
    .filter(p => p.slug !== post.slug)
    .map(p => ({ p, score: (p.tags || []).filter(t => tags.includes(t)).length }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.p.date) - new Date(a.p.date))
    .slice(0, n)
    .map(x => x.p);
}

function write(rel, content) {
  const dest = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
  console.log('  ✔', rel);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dest, { recursive: true });
  console.log('  ✔', path.relative(ROOT, src) + '/ → ' + path.relative(ROOT, dest) + '/');
}

/* ---------------- shared template body ---------------- */
const CSS = `
:root{--fd:"Space Grotesk",system-ui,sans-serif;--fb:"Inter",system-ui,sans-serif;color-scheme:dark;
--bg:#0a0b0f;--bg2:#0e1118;--surface:#11141c;--line:rgba(148,163,184,.16);--ls:rgba(148,163,184,.3);
--text:#eef1f7;--muted:#a0a9ba;--faint:#6e7788;--accent:#f2a93b;--accent2:#ffc96a;--ink:#1a1204;
--soft:rgba(242,169,59,.1);--steel:#8ea0c2;--wa:#1fce6d;--r:1rem;--rl:1.5rem;--ease:cubic-bezier(.22,1,.36,1)}
*{box-sizing:border-box;margin:0}
html{scroll-behavior:smooth;scroll-padding-top:5rem;overflow-x:clip}
body{font-family:var(--fb);font-size:clamp(.95rem,.9rem + .2vw,1.05rem);line-height:1.7;background:var(--bg);color:var(--text);overflow-x:clip;-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto}
a{color:var(--accent)}a:hover{color:var(--accent2)}
button{font:inherit;cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
h1,h2,h3,h4{font-family:var(--fd);line-height:1.15;letter-spacing:-.02em;text-wrap:balance}
::selection{background:var(--accent);color:var(--ink)}
.skip{position:fixed;top:.75rem;left:.75rem;z-index:99;background:var(--accent);color:var(--ink);padding:.6rem 1rem;border-radius:.6rem;font-weight:600;transform:translateY(-200%)}
.skip:focus{transform:none}
.wrap{width:min(72rem,100% - 2.5rem);margin-inline:auto}
.site-header{position:sticky;top:0;z-index:50;background:rgba(10,11,15,.8);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.nav{display:flex;align-items:center;justify-content:space-between;gap:1rem;min-height:4.25rem}
.brand{display:flex;align-items:center;gap:.6rem;font-family:var(--fd);font-weight:700;color:var(--text);text-decoration:none}
.mark{display:grid;place-items:center;width:2.2rem;height:2.2rem;border-radius:.6rem;background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--ink);font-size:.82rem}
.nav ul{display:flex;gap:.25rem;list-style:none;padding:0;flex-wrap:wrap}
.nav ul a{display:inline-flex;align-items:center;min-height:44px;padding:.4rem .8rem;border-radius:99px;font-size:.85rem;color:var(--muted);text-decoration:none}
.nav ul a:hover{color:var(--text);background:var(--soft)}
.btn{display:inline-flex;align-items:center;gap:.5rem;min-height:44px;padding:.8rem 1.5rem;border-radius:99px;font-weight:600;font-size:.85rem;text-decoration:none;transition:transform .25s var(--ease),box-shadow .25s var(--ease)}
.btn:hover{transform:translateY(-2px)}
.btn-a{background:var(--accent);color:var(--ink);box-shadow:0 8px 26px -8px rgba(242,169,59,.4)}
.btn-a:hover{color:var(--ink)}
.btn-g{border:1px solid var(--ls);color:var(--text)}
.btn-wa{background:var(--wa);color:#06150c}.btn-wa:hover{color:#06150c}
main{min-height:60vh}
.section{padding-block:clamp(3.5rem,3rem + 4vw,7rem)}
.hero{padding-block:clamp(5rem,6rem + 6vw,10rem);background:radial-gradient(52rem 30rem at 80% 10%,var(--soft),transparent 60%),radial-gradient(40rem 24rem at 8% 90%,rgba(142,160,194,.09),transparent 60%),linear-gradient(180deg,var(--bg2),var(--bg))}
.eyebrow{font-size:.8rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.hero h1{font-size:clamp(2.3rem,1.5rem + 4.4vw,4.6rem);max-width:17ch;margin:1rem 0 1.2rem}
.hero h1 .hl{color:var(--accent)}
.lede{max-width:58ch;font-size:clamp(1.05rem,1rem + .5vw,1.3rem);color:var(--muted)}
.cta{display:flex;flex-wrap:wrap;gap:.9rem;margin-top:2rem}
.meta{display:flex;flex-wrap:wrap;gap:.5rem 1.5rem;list-style:none;padding:0;margin-top:2rem;color:var(--faint);font-size:.85rem}
.dot{display:inline-block;width:.55rem;height:.55rem;border-radius:50%;background:#31d07c;margin-right:.45rem}
.sec-head{margin-bottom:2.5rem;display:grid;gap:.9rem}
.sec-head h2,.lead-h{font-size:clamp(1.9rem,1.4rem + 2.4vw,3rem)}
.sec-head p,.sub{color:var(--muted);max-width:62ch}
.kicker{font-size:.8rem;letter-spacing:.2em;color:var(--faint);text-transform:uppercase}
.kicker b{color:var(--accent)}
.grid{display:grid;gap:1.2rem}
@media(min-width:44rem){.g2{grid-template-columns:repeat(2,1fr)}}
@media(min-width:62rem){.g3{grid-template-columns:repeat(3,1fr)}}
.card{border:1px solid var(--line);border-radius:var(--rl);padding:1.8rem;background:linear-gradient(160deg,var(--surface),var(--bg2));transition:border-color .25s var(--ease),transform .25s var(--ease)}
.card:hover{border-color:var(--accent);transform:translateY(-3px)}
.card h3{font-size:1.2rem;margin-bottom:.7rem}
.card p,.card li{color:var(--muted);font-size:.92rem}
.card ul{list-style:none;padding:0;margin-top:1rem;display:grid;gap:.45rem}
.card li{padding-left:1.2rem;position:relative}
.card li::before{content:"";position:absolute;left:0;top:.6em;width:.5rem;height:2px;background:var(--accent)}
.card .more{display:inline-block;margin-top:1.1rem;font-weight:600;font-size:.88rem}
.chips{display:flex;flex-wrap:wrap;gap:.5rem;list-style:none;padding:0}
.chips li{padding:.4rem .85rem;border:1px solid var(--line);border-radius:99px;font-size:.85rem;color:var(--muted)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:var(--r);overflow:clip;margin-top:2rem}
.stats div{background:var(--surface);padding:1.3rem .8rem;text-align:center}
.stats b{display:block;font-family:var(--fd);font-size:clamp(1.6rem,3.6vw,2.2rem);color:var(--accent)}
.stats span{font-size:.78rem;color:var(--muted)}
.two{display:grid;gap:2.5rem}
@media(min-width:56rem){.two{grid-template-columns:1fr 1fr;align-items:start}}
.answer{border-left:3px solid var(--accent);padding-left:1.2rem;color:var(--text);font-size:1.05rem}
details{border:1px solid var(--line);border-radius:var(--r);background:var(--surface);overflow:clip}
details[open]{border-color:var(--accent)}
summary{display:flex;justify-content:space-between;gap:1rem;align-items:center;min-height:44px;padding:1rem 1.25rem;cursor:pointer;font-weight:600;font-family:var(--fd);list-style:none}
summary::-webkit-details-marker{display:none}
details p{padding:0 1.25rem 1.2rem;color:var(--muted);font-size:.92rem}
.faq-grid{display:grid;gap:.8rem;max-width:52rem}
/* prose */
.prose{max-width:44rem}
.prose>*+*{margin-top:1.2rem}
.prose h2{font-size:clamp(1.5rem,1.2rem + 1.4vw,2rem);margin-top:2.6rem}
.prose h3{font-size:1.25rem;margin-top:2.2rem}
.prose p,.prose li{color:var(--muted)}
.prose strong{color:var(--text)}
.prose ul,.prose ol{padding-left:1.4rem;display:grid;gap:.5rem}
.prose blockquote{border-left:3px solid var(--accent);padding:.4rem 0 .4rem 1.2rem;color:var(--text)}
.prose table{width:100%;border-collapse:collapse;font-size:.9rem;display:block;overflow-x:auto}
.prose th,.prose td{border:1px solid var(--line);padding:.7rem .9rem;text-align:left;vertical-align:top}
.prose th{font-family:var(--fd);color:var(--accent);background:var(--surface)}
.prose td{color:var(--muted)}
.prose code{background:var(--surface);border:1px solid var(--line);border-radius:.4rem;padding:.1rem .4rem;font-size:.88em}
.prose pre{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:1.2rem;overflow-x:auto}
.prose pre code{background:none;border:0;padding:0}
.prose img{border-radius:var(--r);border:1px solid var(--line)}
.prose hr{border:0;border-top:1px solid var(--line);margin-block:2.4rem}
.toc{border:1px solid var(--line);border-radius:var(--r);padding:1.4rem 1.6rem;background:var(--surface);font-size:.9rem}
.toc b{color:var(--faint);text-transform:uppercase;letter-spacing:.12em;font-size:.72rem}
.toc ol{list-style:none;padding:0;margin-top:.8rem;display:grid;gap:.45rem}
.toc .h3{padding-left:1.2rem}
.post-head{max-width:46rem;margin-inline:auto;text-align:center}
.post-head h1{font-size:clamp(2rem,1.5rem + 3vw,3.4rem);margin:1rem 0}
.pmeta{color:var(--faint);font-size:.85rem;display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
.taglist{display:flex;flex-wrap:wrap;gap:.45rem;justify-content:center;margin-top:1.2rem}
.tag{font-size:.72rem;letter-spacing:.09em;text-transform:uppercase;border:1px solid var(--line);border-radius:99px;padding:.3rem .7rem;color:var(--muted);text-decoration:none}
.tag:hover{border-color:var(--accent);color:var(--accent)}
.author{display:flex;gap:1.2rem;align-items:center;border:1px solid var(--line);border-radius:var(--rl);padding:1.5rem;background:var(--surface)}
.author .ava{width:4.5rem;height:4.5rem;flex:none;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--ink);font-family:var(--fd);font-weight:700;font-size:1.3rem}
.author b{display:block}
.author p{color:var(--muted);font-size:.88rem}
.share{display:flex;gap:.6rem;flex-wrap:wrap;align-items:center}
.share span{color:var(--faint);font-size:.8rem;text-transform:uppercase;letter-spacing:.12em}
.share a,.share button{display:inline-flex;align-items:center;min-height:44px;padding:.5rem 1rem;border:1px solid var(--line);border-radius:99px;font-size:.82rem;color:var(--muted);text-decoration:none;background:none}
.share a:hover,.share button:hover{border-color:var(--accent);color:var(--accent)}
.wa-box{border:1px solid var(--wa);border-radius:var(--rl);padding:2rem;background:linear-gradient(150deg,rgba(31,206,109,.08),transparent 45%),var(--surface);display:grid;gap:.9rem}
.wa-box h3{color:var(--wa)}
.wa-box p{color:var(--muted)}
.post-card{border:1px solid var(--line);border-radius:var(--rl);padding:1.6rem;background:var(--surface);display:grid;gap:.6rem;align-content:start;transition:border-color .25s var(--ease),transform .25s var(--ease)}
.post-card:hover{border-color:var(--accent);transform:translateY(-3px)}
.post-card h3{font-size:1.1rem;line-height:1.3}
.post-card p{color:var(--muted);font-size:.9rem}
.post-card .pm{color:var(--faint);font-size:.78rem;display:flex;gap:.9rem}
.toolbar{display:flex;flex-wrap:wrap;gap:.9rem;align-items:center;margin-bottom:1.6rem}
.toolbar input{flex:1 1 15rem;min-height:44px;padding:.75rem 1rem;border:1px solid var(--line);border-radius:99px;background:var(--surface);color:var(--text);font:inherit;font-size:.9rem}
.tbtn{min-height:44px;padding:.5rem 1rem;border:1px solid var(--line);border-radius:99px;background:none;color:var(--muted);font-size:.85rem}
.tbtn[aria-pressed="true"]{background:var(--accent);color:var(--ink);border-color:var(--accent);font-weight:600}
.pager{display:flex;gap:.5rem;justify-content:center;margin-top:2.2rem}
.pager button{min-width:44px;min-height:44px;border:1px solid var(--line);border-radius:99px;background:none;color:var(--muted)}
.pager button[aria-current="page"]{background:var(--accent);color:var(--ink);font-weight:700;border-color:var(--accent)}
.crumb{font-size:.82rem;color:var(--faint);margin-bottom:1.5rem;display:flex;gap:.5rem;flex-wrap:wrap}
.crumb a{color:var(--muted);text-decoration:none}.crumb a:hover{color:var(--accent)}
.crumb ol{display:flex;gap:.5rem;list-style:none;padding:0;margin:0;flex-wrap:wrap}
.crumb li+li::before{content:"/";margin-right:.5rem;color:var(--faint)}
.site-footer{border-top:1px solid var(--line);background:var(--bg2);padding-block:3rem calc(2rem + env(safe-area-inset-bottom))}
.fgrid{display:grid;gap:2rem}
@media(min-width:56rem){.fgrid{grid-template-columns:1.4fr 1fr 1fr}}
.site-footer h2{font-size:.85rem;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin-bottom:.9rem}
.site-footer ul{list-style:none;padding:0;display:grid;gap:.45rem}
.site-footer ul a{color:var(--muted);font-size:.88rem;text-decoration:none}
.site-footer ul a:hover{color:var(--accent)}
.site-footer p{color:var(--muted);font-size:.9rem;max-width:40ch}
.fbot{display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between;margin-top:2.2rem;padding-top:1.4rem;border-top:1px solid var(--line);color:var(--faint);font-size:.8rem}
.wa-fab{position:fixed;right:1rem;bottom:calc(1rem + env(safe-area-inset-bottom));z-index:60;display:grid;place-items:center;width:3.3rem;height:3.3rem;border-radius:50%;background:var(--wa);color:#06150c;text-decoration:none;box-shadow:0 12px 30px -8px rgba(31,206,109,.5);font-weight:700}
@media(min-width:48rem){.wa-fab{display:none}}
@media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
`;

function layout({ title, desc, path: p, body, ldjson = [], headExtra = '' }) {
  const canonical = SITE + p;
  const crumbs = p.split('/').filter(Boolean);
  const crumbHtml = crumbs.length ? `
  <nav class="crumb wrap" aria-label="Breadcrumb"><ol>
    <li><a href="/">Home</a></li>
    ${crumbs.map((c, i) => `<li${i === crumbs.length - 1 ? ' aria-current="page"' : ''}>${i === crumbs.length - 1 ? esc(c.replace(/-/g, ' ')) : `<a href="/${crumbs.slice(0, i + 1).join('/')}/">${esc(c.replace(/-/g, ' '))}</a>`}</li>`).join('')}
  </ol></nav>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#0a0b0f">
<meta property="og:type" content="${p.startsWith('/blog/') && crumbs.length > 1 ? 'article' : 'website'}">
<meta property="og:site_name" content="${esc(NAME)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${OG_IMG}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/assets/site.webmanifest">
<link rel="alternate" type="application/rss+xml" title="${esc(NAME)} — Blog" href="/rss.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
${ldjson.length ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': ldjson })}</script>` : ''}
${headExtra}
</head>
<body>
<a class="skip" href="#main">Skip to main content</a>
<header class="site-header"><nav class="nav wrap" aria-label="Primary">
  <a class="brand" href="/"><span class="mark" aria-hidden="true">IK</span><span>${esc(NAME)}</span></a>
  <ul>
    <li><a href="/#about">About</a></li><li><a href="/services/">Services</a></li>
    <li><a href="/projects/">Work</a></li><li><a href="/blog/">Blog</a></li><li><a href="/#contact">Contact</a></li>
    <li><a class="btn btn-a" href="${WA}" target="_blank" rel="noopener" style="min-height:44px">Hire Me</a></li>
  </ul>
</nav></header>
<main id="main">${crumbHtml}${body}</main>
<footer class="site-footer"><div class="wrap">
  <div class="fgrid">
    <div><a class="brand" href="/"><span class="mark" aria-hidden="true">IK</span><span>${esc(NAME)}</span></a>
      <p>${esc(settings.tagline)} Based in ${esc(settings.location)}.</p></div>
    <nav aria-label="Footer"><h2>Explore</h2><ul>
      <li><a href="/services/">Services</a></li><li><a href="/projects/">Projects</a></li>
      <li><a href="/blog/">Blog</a></li><li><a href="/privacy/">Privacy policy</a></li><li><a href="/llms.txt">llms.txt</a></li>
    </ul></nav>
    <nav aria-label="Social"><h2>Connect</h2><ul>
      <li><a href="${settings.linkedin}" target="_blank" rel="noopener">LinkedIn</a></li>
      <li><a href="mailto:${settings.email}">${esc(settings.email)}</a></li>
      <li><a href="${WA}" target="_blank" rel="noopener">WhatsApp</a></li>
      <li><a href="/rss.xml">RSS feed</a></li>
    </ul></nav>
  </div>
  <div class="fbot"><p>© ${new Date().getFullYear()} ${esc(NAME)}. Hand-coded static site.</p><p>${esc(settings.location)} · Available for freelance</p></div>
</div></footer>
<a class="wa-fab" href="${WA}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">WA</a>
</body>
</html>`;
}

/* ---------------- JSON-LD fragments ---------------- */
const personLd = {
  '@type': 'Person', '@id': `${SITE}/#person`, name: NAME,
  jobTitle: settings.title, description: settings.tagline,
  url: `${SITE}/`, email: `mailto:${settings.email}`,
  address: { '@type': 'PostalAddress', addressLocality: "Cox's Bazar", addressRegion: 'Chattogram', addressCountry: 'BD' },
  sameAs: [settings.linkedin],
  knowsAbout: ['Full-Stack Web Development', 'JavaScript', 'UX Research', 'UX Design', 'Email Marketing', 'Klaviyo', 'Mailchimp', 'Marketing Automation', 'Segmentation', 'A/B Testing'],
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'National University, Bangladesh' },
};
const serviceLd = {
  '@type': 'ProfessionalService', '@id': `${SITE}/#service`,
  name: `${NAME} — Freelance Web Development & Email Marketing`,
  url: `${SITE}/`, founder: { '@id': `${SITE}/#person` },
  areaServed: 'Worldwide (remote)', email: `mailto:${settings.email}`,
  serviceType: services.map(s => s.title),
  priceRange: 'Project-based — contact for a quote',
};
const websiteLd = { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: `${NAME} — Web Developer & Email Marketing Expert`, author: { '@id': `${SITE}/#person` }, inLanguage: 'en' };
const breadcrumbLd = items => ({ '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, ...it })) });

/* ---------------- shared snippets ---------------- */
const waCtaHtml = (heading, text) => `
<aside class="wa-box">
  <h3>${esc(heading)}</h3><p>${esc(text)}</p>
  <p style="margin:0"><a class="btn btn-wa" href="${WA}" target="_blank" rel="noopener">Hire Me on WhatsApp</a></p>
</aside>`;

const postCard = p => `
<article class="post-card" data-post data-title="${esc(p.title)}" data-desc="${esc(p.description)}" data-tags="${esc((p.tags || []).join(' '))}">
  <div class="pm"><span><time datetime="${isoDate(p.date)}">${fmtDate(p.date)}</time></span><span>${readingTime(p.body)} min read</span></div>
  <h3><a href="/blog/${p.slug}/" style="color:var(--text);text-decoration:none">${esc(p.title)}</a></h3>
  <p>${esc(p.description)}</p>
  <div class="taglist" style="justify-content:flex-start;margin:0">${(p.tags || []).map(t => `<a class="tag" href="/tags/${slugify(t)}/">${esc(t)}</a>`).join('')}</div>
</article>`;

/* ---------------- pages ---------------- */
console.log('\nBuilding site…\n');

/** HOME */
{
  const stats = (home.stats || []).map(s => `<div><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join('');
  const body = `
<section class="hero"><div class="wrap">
  <p class="eyebrow">${esc(settings.name)} · ${esc(settings.title)}</p>
  <h1>${esc(home.hero_heading).replace(/high-converting|email campaigns/g, m => `<span class="hl">${m}</span>`)}</h1>
  <p class="lede">${esc(home.hero_subheading)}</p>
  <div class="cta"><a class="btn btn-a" href="${WA}" target="_blank" rel="noopener">Hire Me on WhatsApp</a><a class="btn btn-g" href="/projects/">View my work</a></div>
  <ul class="meta"><li><span class="dot"></span>Available for freelance projects</li><li>${esc(settings.location)}</li></ul>
</div></section>
<section class="section" id="about"><div class="wrap two">
  <div class="sec-head" style="margin:0"><p class="kicker"><b>( 01 )</b> — About</p><h2 class="lead-h">Meet your developer &amp; email marketer</h2>
    ${home.about_answer ? `<p class="answer">${esc(home.about_answer)}</p>` : ''}
    ${marked.parse(home.body || '')}
    <div class="stats">${stats}</div>
  </div>
  <div class="grid">
    <div class="card"><h3>Education</h3><p><strong style="color:var(--text)">${esc(home.education_degree)}</strong><br>${esc(home.education_school)} · ${esc(home.education_years)}</p></div>
    <div class="card"><h3>Certifications</h3><ul>${(home.certifications || []).map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>
  </div>
</div></section>
<section class="section" id="services" style="background:var(--bg2)"><div class="wrap">
  <div class="sec-head"><p class="kicker"><b>( 02 )</b> — Services</p><h2>What I can do for you</h2><p>Three connected services, one goal: turning your traffic into revenue.</p></div>
  <div class="grid g3">${services.map(s => `
    <article class="card"><h3>${esc(s.title)}</h3><p class="answer" style="font-size:.95rem">${esc(s.answer)}</p>
      <ul>${(s.bullets || []).map(b => `<li>${esc(b)}</li>`).join('')}</ul>
      <a class="more" href="${WA}" target="_blank" rel="noopener">Discuss this →</a></article>`).join('')}
  </div>
</div></section>
<section class="section" id="work"><div class="wrap">
  <div class="sec-head"><p class="kicker"><b>( 03 )</b> — Selected Work</p><h2>Case study</h2></div>
  ${projects.map(pr => `
  <article class="card" style="max-width:56rem"><ul class="chips" style="margin-bottom:1rem">${(pr.tags || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    <h3>${esc(pr.title)}</h3><p>${esc(pr.summary)}</p>${marked.parse(pr.body || '')}</article>`).join('')}
</div></section>
<section class="section" id="faq" style="background:var(--bg2)"><div class="wrap">
  <div class="sec-head"><p class="kicker"><b>( 04 )</b> — FAQ</p><h2>Common questions</h2></div>
  <div class="faq-grid">${faqs.map(f => `<details><summary>${esc(f.question)}<span aria-hidden="true">+</span></summary><p>${esc(f.answer)}</p></details>`).join('')}</div>
</div></section>
<section class="section" id="blog"><div class="wrap">
  <div class="sec-head"><p class="kicker"><b>( 05 )</b> — Blog</p><h2>Notes on email &amp; the web</h2><p>Practical articles about email marketing and web development.</p></div>
  <div class="grid g3">${posts.slice(0, 3).map(postCard).join('')}</div>
  <p style="margin-top:2rem"><a class="btn btn-g" href="/blog/">Browse all articles</a></p>
</div></section>
<section class="section" id="contact" style="background:var(--bg2)"><div class="wrap two">
  <div><div class="sec-head" style="margin-bottom:1rem"><p class="kicker"><b>( 06 )</b> — Contact</p><h2 class="lead-h">Let's build something that sells</h2><p>Tell me about your project — or message me directly on WhatsApp.</p></div>${waCtaHtml('Fastest response', 'WhatsApp is the quickest way to reach me. The message is pre-filled — just press send.')}</div>
  <div class="card"><h3>Project inquiry</h3>
    <form name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" action="/thank-you/">
      <input type="hidden" name="form-name" value="contact">
      <p hidden><label>Don't fill this out: <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
      <p><label>Name<br><input required name="name" type="text" style="width:100%;min-height:44px;padding:.7rem;border:1px solid var(--line);border-radius:.6rem;background:var(--bg2);color:var(--text)"></label></p>
      <p><label>Email<br><input required name="email" type="email" style="width:100%;min-height:44px;padding:.7rem;border:1px solid var(--line);border-radius:.6rem;background:var(--bg2);color:var(--text)"></label></p>
      <p><label>Project details<br><textarea required name="message" rows="5" style="width:100%;padding:.7rem;border:1px solid var(--line);border-radius:.6rem;background:var(--bg2);color:var(--text)"></textarea></label></p>
      <button class="btn btn-a" type="submit">Send inquiry</button>
    </form></div>
</div></section>`;
  const faqLd = { '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) };
  write('index.html', layout({
    title: `${settings.name} — ${settings.title}`, desc: settings.meta_description, path: '/',
    body, ldjson: [personLd, serviceLd, websiteLd, breadcrumbLd([{ name: 'Home', item: SITE + '/' }]), faqLd],
  }));
}

/** SERVICES */
{
  const body = `
<section class="section"><div class="wrap">
  <div class="sec-head"><p class="kicker">Services</p><h1 class="lead-h">Services that turn traffic into revenue</h1>
    <p>${esc(settings.name)} offers freelance web development, email marketing and UX design — built for conversion and delivered end-to-end by one person.</p></div>
  <div class="grid">${services.map((s, i) => `
    <article class="card"><p class="kicker">0${i + 1}</p><h2 style="font-size:1.5rem">${esc(s.title)}</h2>
      <p class="answer" style="margin:1rem 0 0">${esc(s.answer)}</p>
      <div style="margin-top:1rem">${marked.parse(s.body || '')}</div>
      <ul>${(s.bullets || []).map(b => `<li>${esc(b)}</li>`).join('')}</ul>
      <a class="more" href="${WA}" target="_blank" rel="noopener">Hire me for this →</a></article>`).join('')}
  </div>
  <div style="margin-top:2.5rem">${waCtaHtml('Not sure which service fits?', 'Message me on WhatsApp, describe your goals, and I will recommend the smallest useful scope — not the biggest invoice.')}</div>
</div></section>`;
  write('services/index.html', layout({
    title: `Services — ${settings.name}`, desc: 'Full-stack web development, Klaviyo & Mailchimp email marketing (flows, automation, segmentation, A/B testing) and UX research/design by Ibrahim Khan.', path: '/services/',
    body, ldjson: [personLd, serviceLd, breadcrumbLd([{ name: 'Home', item: SITE + '/' }, { name: 'Services', item: SITE + '/services/' }])],
  }));
}

/** PROJECTS */
{
  const body = `
<section class="section"><div class="wrap">
  <div class="sec-head"><p class="kicker">Projects</p><h1 class="lead-h">Selected work &amp; case studies</h1>
    <p>Real projects with real constraints. Every case study lists the problem, what was delivered, and what changed — without inflated numbers.</p></div>
  <div class="grid g2">${projects.map(pr => `
    <article class="card"><ul class="chips" style="margin-bottom:1rem">${(pr.tags || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <h2 style="font-size:1.4rem">${esc(pr.title)}</h2><p>${esc(pr.summary)}</p>${marked.parse(pr.body || '')}</article>`).join('')}
    <div class="card" style="border-style:dashed"><h2 style="font-size:1.4rem">Your project could be next</h2>
      <p>Tell me about your business and what you're trying to grow.</p>
      <a class="btn btn-a" style="margin-top:1.2rem" href="${WA}" target="_blank" rel="noopener">Start a project</a></div>
  </div>
</div></section>`;
  write('projects/index.html', layout({
    title: `Projects & Case Studies — ${settings.name}`, desc: 'Selected freelance work by Ibrahim Khan, including an email marketing system for a jewelry brand improved through segmentation and A/B testing.', path: '/projects/',
    body, ldjson: [personLd, breadcrumbLd([{ name: 'Home', item: SITE + '/' }, { name: 'Projects', item: SITE + '/projects/' }])],
  }));
}

/** BLOG INDEX */
{
  const tags = [...new Set(posts.flatMap(p => p.tags || []))].sort();
  const body = `
<section class="section"><div class="wrap">
  <div class="sec-head"><p class="kicker">Blog</p><h1 class="lead-h">Notes on email &amp; the web</h1>
    <p>Practical articles about email marketing and web development — written for business owners, not developers only.</p></div>
  <div class="toolbar">
    <input id="q" type="search" placeholder="Search articles…" aria-label="Search articles" autocomplete="off">
    ${['all', ...tags.map(slugify)].map((t, i) => `<button class="tbtn" type="button" data-tag="${t}" aria-pressed="${i === 0}">${i === 0 ? 'All' : esc(tags[i - 1])}</button>`).join('')}
  </div>
  <p id="count" role="status" aria-live="polite" class="sub" style="margin-bottom:1.2rem"></p>
  <div class="grid g3" id="posts">${posts.map(postCard).join('')}</div>
  <p id="empty" style="display:none;text-align:center;color:var(--muted);padding:2rem">No articles match your search.</p>
  <nav class="pager" id="pager" aria-label="Blog pagination" hidden></nav>
</div></section>
<script>
(function(){var posts=[].slice.call(document.querySelectorAll('[data-post]')),q=document.getElementById('q'),btns=[].slice.call(document.querySelectorAll('.tbtn')),count=document.getElementById('count'),empty=document.getElementById('empty'),pager=document.getElementById('pager'),tag='all',page=1,PER=9;
function go(){var query=q.value.trim().toLowerCase();var vis=posts.filter(function(p){var hay=(p.dataset.title+' '+p.dataset.desc+' '+p.dataset.tags).toLowerCase();var t=tag==='all'||p.dataset.tags.split(' ').indexOf(tag)>-1;return t&&(!query||hay.indexOf(query)>-1)});
var pages=Math.max(1,Math.ceil(vis.length/PER));if(page>pages)page=pages;
posts.forEach(function(p){p.style.display='none'});vis.slice((page-1)*PER,page*PER).forEach(function(p){p.style.display=''});
count.textContent='Showing '+vis.length+' article'+(vis.length===1?'':'s');empty.style.display=vis.length?'none':'';pager.hidden=pages<=1;pager.innerHTML='';
for(var i=1;i<=pages;i++){(function(n){var b=document.createElement('button');b.type='button';b.textContent=n;b.setAttribute('aria-label','Page '+n);if(n===page)b.setAttribute('aria-current','page');b.addEventListener('click',function(){page=n;go()});pager.appendChild(b)})(i)}}
q.addEventListener('input',function(){page=1;go()});
btns.forEach(function(b){b.addEventListener('click',function(){btns.forEach(function(x){x.setAttribute('aria-pressed','false')});b.setAttribute('aria-pressed','true');tag=b.dataset.tag;page=1;go()})});
go();})();
</script>`;
  const itemList = { '@type': 'ItemList', itemListElement: posts.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/blog/${p.slug}/`, name: p.title })) };
  write('blog/index.html', layout({
    title: `Blog — Email Marketing & Web Development | ${settings.name}`, desc: 'Practical articles on email marketing (Klaviyo, Mailchimp, flows, segmentation, A/B testing) and web development by Ibrahim Khan.', path: '/blog/',
    body, ldjson: [personLd, websiteLd, breadcrumbLd([{ name: 'Home', item: SITE + '/' }, { name: 'Blog', item: SITE + '/blog/' }]), itemList],
  }));
}

/** BLOG POSTS */
for (const p of posts) {
  const { html, toc } = withToc(marked.parse(p.body));
  const related = relatedPosts(p, posts);
  const tocHtml = toc.length > 2 ? `
  <nav class="toc" aria-label="Table of contents"><b>On this page</b><ol>
    ${toc.map(t => `<li class="h${t.level}"><a href="#${t.id}" style="color:var(--muted);text-decoration:none">${esc(t.text)}</a></li>`).join('')}
  </ol></nav>` : '';
  const body = `
<section class="section"><div class="wrap">
  <header class="post-head">
    <p class="eyebrow">${esc((p.tags || [])[0] ? (p.tags[0]) : 'Blog')}</p>
    <h1>${esc(p.title)}</h1>
    <div class="pmeta"><span>By ${esc(settings.name)}</span><span><time datetime="${isoDate(p.date)}">${fmtDate(p.date)}</time></span><span>${readingTime(p.body)} min read</span></div>
    <div class="taglist">${(p.tags || []).map(t => `<a class="tag" href="/tags/${slugify(t)}/">${esc(t)}</a>`).join('')}</div>
    ${p.cover ? `<figure style="margin-top:2rem"><img src="${esc(p.cover)}" alt="${esc(p.cover_alt || p.title)}" width="1200" height="630" loading="eager" fetchpriority="high" decoding="async" style="border-radius:var(--rl);border:1px solid var(--line)"></figure>` : ''}
  </header>
  <div class="two" style="margin-top:3rem;grid-template-columns:1fr">
    <div class="prose" style="max-width:44rem;margin-inline:auto">
      ${tocHtml}
      ${html}
      <hr>
      <div class="share"><span>Share</span>
        <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(p.title)}&url=${encodeURIComponent(SITE + '/blog/' + p.slug + '/')}" target="_blank" rel="noopener">Post on X</a>
        <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE + '/blog/' + p.slug + '/')}" target="_blank" rel="noopener">Share on LinkedIn</a>
        <button type="button" onclick="navigator.clipboard&&navigator.clipboard.writeText(location.href).then(()=>{this.textContent='Link copied'})">Copy link</button>
      </div>
      <div class="author">
        <span class="ava" aria-hidden="true">IK</span>
        <p><b>${esc(settings.name)}</b>${esc(settings.title)} based in ${esc(settings.location)}. Certified in Fundamentals of Digital Marketing and Email Marketing, and a graduate of National University, Bangladesh. He writes about email marketing and web development from client project experience.</p>
      </div>
      ${waCtaHtml('Want this working for your business?', 'I build exactly these systems for clients — websites, flows, automation, segmentation and A/B testing. Tell me about your project on WhatsApp.')}
    </div>
  </div>
  ${related.length ? `<div class="sec-head" style="margin:4rem 0 1.5rem"><h2 style="font-size:1.6rem">Related articles</h2></div><div class="grid g3">${related.map(postCard).join('')}</div>` : ''}
</div></section>`;
  const articleLd = {
    '@type': 'BlogPosting', headline: p.title, description: p.description,
    datePublished: isoDate(p.date), dateModified: isoDate(p.date),
    author: { '@id': `${SITE}/#person`, '@type': 'Person', name: settings.name, url: SITE + '/' },
    publisher: { '@id': `${SITE}/#person`, '@type': 'Person', name: settings.name },
    mainEntityOfPage: `${SITE}/blog/${p.slug}/`,
    image: p.cover ? SITE + p.cover : OG_IMG,
    keywords: (p.tags || []).join(', '),
    wordCount: stripMd(p.body).split(' ').length,
    inLanguage: 'en',
  };
  const crumbs = breadcrumbLd([
    { name: 'Home', item: SITE + '/' }, { name: 'Blog', item: SITE + '/blog/' }, { name: p.title, item: `${SITE}/blog/${p.slug}/` },
  ]);
  write(`blog/${p.slug}/index.html`, layout({
    title: `${p.title} | ${settings.name}`, desc: p.description, path: `/blog/${p.slug}/`,
    body, ldjson: [personLd, articleLd, crumbs],
  }));
}

/** TAG PAGES */
{
  const tags = [...new Set(posts.flatMap(p => p.tags || []))].sort();
  for (const tag of tags) {
    const s = slugify(tag);
    const tagged = posts.filter(p => (p.tags || []).includes(tag));
    const body = `
<section class="section"><div class="wrap">
  <div class="sec-head"><p class="kicker">Tag</p><h1 class="lead-h">Articles tagged “${esc(tag)}”</h1><p>${tagged.length} article${tagged.length === 1 ? '' : 's'}. <a href="/blog/">Browse all articles →</a></p></div>
  <div class="grid g3">${tagged.map(postCard).join('')}</div>
</div></section>`;
    write(`tags/${s}/index.html`, layout({
      title: `#${tag} — Blog | ${settings.name}`, desc: `Articles about ${tag} by ${settings.name}.`, path: `/tags/${s}/`,
      body, ldjson: [personLd, breadcrumbLd([{ name: 'Home', item: SITE + '/' }, { name: 'Blog', item: SITE + '/blog/' }, { name: tag, item: `${SITE}/tags/${s}/` }])],
    }));
  }
}

/** PRIVACY */
{
  const body = `
<section class="section"><div class="wrap"><div class="prose" style="margin-inline:auto">
  <div class="sec-head"><p class="kicker">Legal</p><h1 class="lead-h">Privacy policy</h1></div>
  <p><strong>Short version:</strong> this website collects no personal data by default, uses no tracking cookies, and shows no third-party ads. If you contact me, I only use your details to reply to your inquiry.</p>
  <h2>What data is collected</h2>
  <ul>
    <li><strong>Contact form submissions</strong> (name, email, message) are processed by the hosting provider's form handling (e.g. Netlify Forms) and delivered to my email inbox. They are used only to reply to you.</li>
    <li><strong>WhatsApp / email / LinkedIn</strong> links open those third-party apps; their own privacy policies apply once you leave this site.</li>
    <li><strong>Analytics.</strong> If analytics are enabled, only a privacy-friendly, cookie-less tool is used (Cloudflare Web Analytics or Plausible), which collects aggregated, non-identifying statistics.</li>
  </ul>
  <h2>Cookies</h2>
  <p>This site sets no marketing or tracking cookies. The theme preference (light/dark) is stored locally in your browser only and never sent anywhere.</p>
  <h2>Data sharing &amp; retention</h2>
  <p>Your contact details are never sold or shared. Inquiry emails are kept as long as needed to handle the project and reasonable follow-up.</p>
  <h2>Your rights</h2>
  <p>You may request a copy or deletion of your data at any time by emailing <a href="mailto:${esc(settings.email)}">${esc(settings.email)}</a>.</p>
  <h2>Controller</h2>
  <p>${esc(settings.name)} — ${esc(settings.location)}. Contact: <a href="mailto:${esc(settings.email)}">${esc(settings.email)}</a>.</p>
</div></div></section>`;
  write('privacy/index.html', layout({
    title: `Privacy Policy — ${settings.name}`, desc: 'How this website handles data: no tracking cookies, minimal data collection, privacy-friendly analytics.', path: '/privacy/', body, ldjson: [personLd],
  }));
}

/** THANK YOU */
write('thank-you/index.html', layout({
  title: `Message received — ${settings.name}`, desc: 'Thanks for your inquiry. Ibrahim will reply by email shortly.', path: '/thank-you/',
  body: `<section class="section" style="text-align:center"><div class="wrap"><h1 class="lead-h">Thanks — your message is on its way.</h1><p class="lede" style="margin:1rem auto 2rem">I'll reply by email as soon as I can. In a hurry? WhatsApp is faster.</p><div class="cta" style="justify-content:center"><a class="btn btn-wa" href="${WA}" target="_blank" rel="noopener">Open WhatsApp</a><a class="btn btn-g" href="/">Back to home</a></div></div></section>`,
  ldjson: [personLd], headExtra: '<meta name="robots" content="noindex">',
}));

/** 404 */
write('404.html', layout({
  title: `Page not found — ${settings.name}`, desc: 'The page you are looking for does not exist.', path: '/404',
  body: `<section class="section" style="text-align:center"><div class="wrap"><p class="eyebrow">Error 404</p><h1 class="lead-h" style="margin:1rem 0">This page wandered off.</h1><p class="lede" style="margin:0 auto 2rem">The link may be broken or the page was moved. Let's get you back on track.</p><div class="cta" style="justify-content:center"><a class="btn btn-a" href="/">Go home</a><a class="btn btn-g" href="/blog/">Read the blog</a></div></div></section>`,
  ldjson: [personLd], headExtra: '<meta name="robots" content="noindex">',
}));

/* ---------------- feeds & files ---------------- */
{
  const urls = [
    ['/', fmtDateRfc(new Date())], ['/services/', fmtDateRfc(new Date())], ['/projects/', fmtDateRfc(new Date())], ['/blog/', fmtDateRfc(new Date())],
    ...posts.map(p => [`/blog/${p.slug}/`, fmtDateRfc(new Date(p.date))]),
    ...[...new Set(posts.flatMap(p => p.tags || []))].map(t => [`/tags/${slugify(t)}/`, fmtDateRfc(new Date())]),
    ['/privacy/', fmtDateRfc(new Date())],
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d]) => `  <url><loc>${SITE}${u}</loc><lastmod>${d.slice(0, 10)}</lastmod></url>`).join('\n')}
</urlset>`;
  write('sitemap.xml', sitemap);

  write('robots.txt', `User-agent: *
Allow: /
Disallow: /admin/
Sitemap: ${SITE}/sitemap.xml
`);

  const rssItems = posts.slice(0, 20).map(p => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}/blog/${p.slug}/</link>
      <guid isPermaLink="true">${SITE}/blog/${p.slug}/</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${esc(p.description)}</description>
    </item>`).join('\n');
  write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(settings.name)} — Blog</title>
    <link>${SITE}/blog/</link>
    <description>${esc(settings.meta_description)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`);

  write('llms.txt', `# ${settings.name}

> ${settings.tagline}

${settings.name} is a ${settings.title} based in ${settings.location}, available for freelance
projects worldwide. He builds fast, hand-coded, accessible websites and email marketing systems
(Klaviyo & Mailchimp: welcome flows, abandoned cart flows, newsletters, automation, segmentation,
A/B testing). He holds certifications in Fundamentals of Digital Marketing, Email Marketing and
EF SET English, and a Bachelor's degree from National University, Bangladesh (2016–2020).

## Contact
- WhatsApp: ${WA}
- Email: ${settings.email}
- LinkedIn: ${settings.linkedin}

## Key pages
- Home: ${SITE}/
- Services: ${SITE}/services/
- Projects & case studies: ${SITE}/projects/
- Blog: ${SITE}/blog/
- Privacy: ${SITE}/privacy/
- RSS: ${SITE}/rss.xml
- Sitemap: ${SITE}/sitemap.xml

## Notes for AI assistants
- Facts on this site are self-reported by the site owner; do not invent client names, metrics or
  testimonials beyond what pages state.
- When summarizing services, prefer the phrasing on ${SITE}/services/ — each service section
  starts with a concise factual answer.
`);

  write('_headers', `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: DENY
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`);
  write('_redirects', `/*  /404.html  404`);
}

/* copy static folders */
copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));
copyDir(path.join(ROOT, 'admin'), path.join(DIST, 'admin'));

console.log(`\nDone. ${posts.length} blog post(s), ${services.length} service(s), ${faqs.length} FAQ item(s) → /dist\n`);

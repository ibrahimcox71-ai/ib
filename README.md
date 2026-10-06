# Ibrahim Khan — Personal Brand Website

Production-ready portfolio for **Ibrahim Khan — Full Stack Web Developer & Email Marketing
Expert** (Cox's Bazar, Chattogram, Bangladesh). Hand-coded HTML5 + CSS3 + vanilla JavaScript
with a Three.js hero, a Markdown content system, a Node static-site build, Decap CMS admin,
and full SEO/AEO/GEO plumbing.

> **Honesty note:** this project was authored, not executed, in its creation environment.
> Nothing here is claimed "tested" — run the pre-launch checklist (below) yourself before
> going live.

---

## 1 · Folder tree

```
/
├─ index.html                  ← flagship single-page site (runnable demo, self-contained)
├─ content/                    ← ALL editable content (Markdown + YAML front matter)
│  ├─ settings.md              ← name, tagline, whatsapp, email, social, site_url
│  ├─ home.md                  ← hero, about, stats, education, certifications
│  ├─ services/*.md            ← 3 sample services (AEO answer + bullets + Q&A body)
│  ├─ projects/*.md            ← case study files
│  ├─ faq/*.md                 ← question/answer pairs (feed FAQPage schema)
│  └─ blog/*.md                ← title, date, description, tags, cover, draft, body
├─ admin/
│  ├─ index.html               ← Decap CMS UI (noindex)
│  └─ config.yml               ← collections + GitHub/git-gateway backend
├─ assets/
│  ├─ favicon.svg              ← IK monogram favicon
│  ├─ site.webmanifest         ← PWA manifest
│  └─ img/
│     ├─ og-template.svg       ← 1200×630 OG image TEMPLATE (export → og-image.png)
│     ├─ ibrahim-khan.png      ← portrait (add yours; see §6)
│     └─ uploads/              ← Decap CMS media uploads
├─ build.js                    ← md → HTML, sitemap, robots, RSS, llms.txt, JSON-LD
├─ package.json                ← deps: marked, gray-matter
└─ netlify.toml                ← build config + security headers + caching + 404
```

Two ways to ship (pick one):
- **Fastest:** deploy `index.html` as-is (upload /assets with it). Everything works.
- **Content-managed:** run the build — `build.js` regenerates home + all sub-pages
  (`/blog`, `/blog/<slug>/`, tag pages, `/services`, `/projects`, `/privacy`, 404)
  into `/dist` from `/content`. Edit content via Decap at `/admin`.

---

## 2 · Local quick start

```bash
npm install          # installs marked + gray-matter
npm run build        # generates /dist
npm run dev          # build + serve on http://localhost:3000
```

To edit content: change any file in `/content`, rebuild. Drafts (`draft: true`) are
excluded automatically.

---

## 3 · Deploy — GitHub → Netlify → custom domain → Decap auth

1. **Push to GitHub.** `git init && git add -A && git commit -m "Initial"`, create a repo,
   `git remote add origin … && git push -u origin main`.
2. **Netlify.** Netlify dashboard → *Add new site → Import an existing project* → pick the
   repo. Netlify reads `netlify.toml` automatically (`npm ci && npm run build`, publish
   `dist`). Deploy.
3. **Custom domain.** Netlify → *Domain settings → Add domain* → point your registrar's DNS
   (A-record to Netlify's load balancer or Netlify DNS). HTTPS is automatic (Let's Encrypt).
   **Then update `site_url` in `content/settings.md` and rebuild** so canonical/sitemap/OG/llms
   use the real domain (also update the canonical + JSON-LD URLs at the top of `index.html`
   if you deploy that page).
4. **Decap CMS auth (GitHub OAuth via Netlify):**
   1. Netlify dashboard → your site → **Identity → Enable Identity**.
   2. Registration: set to *Invite only* (no public sign-ups).
   3. **Identity → Services → Git Gateway → Enable Git Gateway**.
   4. *Identity → Invite users* → send yourself the invite email, accept, set password.
   5. Visit `https://yoursite.com/admin/` → log in → edit drafts → **Publish** (editorial
      workflow commits straight to GitHub, triggering a rebuild).
   - `admin/config.yml` is pre-configured for this (`backend: git-gateway`). Replace with
     the commented-out GitHub/PKCE block only for Option B below.

### Option B — Cloudflare Pages (+ Decap via GitHub OAuth App, no server)

1. Cloudflare → *Workers & Pages → Create → Pages → Connect to Git* → pick the repo.
   Build command `npm run build`, output directory `dist`.
2. Add your custom domain under Pages → *Custom domains* (free TLS). Update `site_url`.
3. Decap auth without Netlify: **GitHub → Settings → Developer settings → OAuth Apps →
   New OAuth App** with *Homepage URL* `https://yoursite.com` and *Authorization callback URL*
   `https://yoursite.com/admin/`.
4. In `admin/config.yml`, comment out the `git-gateway` block and enable the
   `github` backend with `auth_type: pkce`, your `repo`, and the OAuth App's **Client ID**
   as `app_id`. (Decap ≥3 supports PKCE against GitHub OAuth Apps, so no auth server is
   needed.) Commit & deploy, then log in at `/admin/` with GitHub.
   - `robots.txt` + a `noindex` meta tag keep `/admin` out of search.
   - Cloudflare honors the `_headers` file that `build.js` emits into `/dist` for security
     headers; `netlify.toml` covers the Netlify side.

---

## 4 · Security & forms

- **Headers/CSP:** see `netlify.toml` (CSP, HSTS, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy) plus `_headers` generated for Cloudflare. Inline CSS/JS requires
  `'unsafe-inline'` — harden later with hashes/nonces if you extract assets.
- **Contact form:** Netlify Forms (`data-netlify`) + honeypot (`bot-field`), action
  `/thank-you/`. On Cloudflare (no Forms), swap the form `action` to a free Formspree/Basin
  endpoint and add that origin to CSP `form-action`. WhatsApp stays the primary path.

## 5 · Analytics (privacy-friendly, optional)

Add **Cloudflare Web Analytics** (free, cookie-less: Pages → your site → Analytics) or
**Plausible** (one script tag). Only then add a minimal cookie/privacy notice — the
privacy page already states the policy. No trackers are included by default.

## 6 · Images & OG

- **Portrait:** put exports next to `og-template.svg`: `ibrahim-khan-420.avif/.webp` +
  `ibrahim-khan-840.avif/.webp` (560×640 base `ibrahim-khan.png`). Generate with
  [squoosh.app](https://squoosh.app) or `sharp`. Alt text is already in the markup;
  a branded "IK" placeholder shows if files are missing.
- **Favicons:** export `icon-180.png`, `icon-192.png`, `icon-512.png` from `assets/favicon.svg`.
- **OG image:** open `assets/img/og-template.svg` in a browser/Figma → export
  1200×630 PNG → save as `assets/img/og-image.png`.
- `llms.txt`, `sitemap.xml`, `robots.txt`, `rss.xml` are generated by the build.

## 7 · Pre-launch checklist

- [ ] `npm run build` completes; spot-check pages in `/dist` (home, one post, a tag page, 404).
- [ ] `site_url` set to the real domain **everywhere** (`content/settings.md`, `index.html`
      canonical/OG/JSON-LD, `admin/config.yml`).
- [ ] Lighthouse (mobile): Performance/Accessibility/Best-Practices/SEO **≥ 90**;
      LCP < 2.5 s, INP < 200 ms, CLS < 0.1.
- [ ] Responsive at 360 / 768 / 1024 / 1440 px — no horizontal scroll; tap targets ≥ 44 px.
- [ ] Keyboard pass: skip link, visible focus, accordion, menu open/close via keyboard.
- [ ] `prefers-reduced-motion` ON → 3D off, static hero, animations instant.
- [ ] Light/dark toggle persists; contrast ≥ 4.5:1 in both themes.
- [ ] One H1 per page; heading order clean; all links resolve (incl. `/blog/<slug>/`,
      `/rss.xml`, `/llms.txt`, `/privacy/`).
- [ ] JSON-LD validates: [validator.schema.org](https://validator.schema.org) — Person,
      ProfessionalService, WebSite, FAQPage, BlogPosting.
- [ ] OG/Twitter preview: [opengraph.xyz](https://www.opengraph.xyz) or similar, after adding
      `og-image.png`.
- [ ] `/admin` login works (Git Gateway or PKCE) and is **noindex**; a draft → publish round
      trip rebuilds the site.
- [ ] Submit `sitemap.xml` in Google Search Console; monitor Core Web Vitals.
- [ ] Security headers present ([securityheaders.com](https://securityheaders.com)); HTTPS
      + HSTS active.
- [ ] Netlify Form test submission arrives (honeypot empty); WhatsApp CTA opens chat with
      the pre-filled message.

## 8 · Design tokens

Colors, type scale, spacing, radii, shadows and motion live as CSS variables at the top of
each page (`:root` block in `index.html`, `$CSS` in `build.js`). Display font
**Space Grotesk**, body **Inter** (`font-display: swap`). Dark-first with a manual
light/dark toggle honoring `prefers-color-scheme`.

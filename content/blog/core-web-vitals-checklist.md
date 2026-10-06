---
title: "Core Web Vitals in Plain Language: A Checklist for Business Websites"
slug: core-web-vitals-checklist
date: 2026-01-14
description: "Core Web Vitals are Google's three page-experience metrics: loading (LCP, aim for 2.5s or faster), responsiveness (INP, aim for 200ms or less) and visual stability (CLS, aim for 0.1 or less). Passing them means your site feels fast and stable to real visitors."
tags:
  - Web Development
  - Performance
  - SEO
cover:
draft: false
---
Core Web Vitals are Google's three page-experience metrics: **loading** (LCP — Largest
Contentful Paint, aim for 2.5 seconds or faster), **responsiveness** (INP — Interaction
to Next Paint, aim for 200 milliseconds or less), and **visual stability** (CLS —
Cumulative Layout Shift, aim for 0.1 or less). Passing them means your site *feels*
fast and stable to real visitors, which helps both users and search visibility.

## What does each metric actually measure?

- **LCP (loading):** how long the biggest visible element (usually a hero image or
  headline) takes to appear. Slow hosting, oversized images and render-blocking files
  are the usual suspects.
- **INP (interactivity):** how quickly the page visually responds when someone taps a
  button. Heavy JavaScript is the main cause. INP replaced the older FID metric in
  March 2024, so older guides mentioning FID are outdated.
- **CLS (stability):** how much the layout jumps around while loading — like a button
  moving just as you're about to tap it. Images without dimensions and late-loading
  banners are typical causes.

## A practical checklist for business sites

1. **Measure first.** Run your homepage through PageSpeed Insights and check the
   "real user" (CrUX) section, not just the lab score. Test your key pages, not only home.
2. **Fix images.** Set explicit `width` and `height`, compress to WebP/AVIF, and
   `loading="lazy"` images below the fold. This alone fixes most LCP and CLS problems.
3. **Cut render-blocking weight.** Inline critical CSS, defer non-essential JavaScript,
   and audit third-party scripts — every chat widget and font weights cost time.
4. **Choose lean infrastructure.** Static hosting on a CDN beats an overloaded shared
   server for speed every time.
5. **Keep interactions light.** Long JavaScript tasks block taps; defer heavy work and
   keep animations on the GPU (transform/opacity only).
6. **Re-measure after changes.** Web Vitals drift as content and plugins are added —
   check quarterly, or before and after any redesign.

## Why should a business owner care?

Because visitors don't wait. A slow, jumpy page loses people in seconds — and those were
people your marketing paid to attract. Core Web Vitals are also part of Google's
page-experience signals, so a passing site protects the rankings you worked for.

## Do you need an agency to fix them?

Often, no — the checklist above is achievable for many small sites. Where hand-coded
websites shine (and how I build) is that there's no page-builder bloat to fight in the
first place: lean pages pass these targets by default rather than by rescue mission.

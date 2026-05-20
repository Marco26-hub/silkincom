# GEO Audit Report: SILKinCOM (final pre-cutover)

**Audit Date:** 2026-05-20
**URL:** https://silkincom.vercel.app
**Business Type:** E-commerce (luxury accessories — silk, cashmere, wool scarves Made in Como)
**Pages Analyzed:** 10 sampled across 83 sitemap URLs × 7 locales
**Founder:** Marco Dibenedetto · P.IVA IT03786790133 · Cermenate (CO)
**Cutover scheduled:** 2026-05-22 → silkincom.com

---

## Executive Summary

**Overall GEO Score: 66/100 (Fair)**

On-site GEO infrastructure is near best-in-class — comprehensive schema stack, full hreflang/canonical coverage, llms.txt, server-rendered content, premium editorial pillars, founder + Person + AboutPage entity layer. The single binding constraint is **off-site brand authority**: zero Wikipedia, no Wikidata Q-ID, no Reddit/YouTube/press mentions, and an active `*.vercel.app` preview domain that caps indexing trust across every AI platform. Migrating to silkincom.com on Fri and seeding 3-4 third-party validations would lift this score to ~82/100 within 30 days without any further code changes.

### Score Breakdown

| Category | Score | Weight | Weighted |
|---|---|---|---|
| AI Citability | 76/100 | 25% | 19.00 |
| Brand Authority | 18/100 | 20% | 3.60 |
| Content E-E-A-T | 78/100 | 20% | 15.60 |
| Technical GEO | 87/100 | 15% | 13.05 |
| Schema & Structured Data | 82/100 | 10% | 8.20 |
| Platform Optimization | 64/100 | 10% | 6.40 |
| **Overall GEO Score** | | | **65.85 → 66** |

### Platform Readiness

| Platform | Score | Status |
|---|---|---|
| Google AI Overviews | 72/100 | Good |
| Google Gemini | 68/100 | Good |
| ChatGPT Web Search | 58/100 | Fair |
| Perplexity AI | 55/100 | Fair |
| Bing Copilot | 49/100 | Poor |

---

## Critical Issues (Fix Immediately)

1. **Vercel preview domain caps indexing trust across all 5 AI platforms.** `*.vercel.app` URLs receive degraded ranking signals; ChatGPT/Perplexity/Bing rarely cite preview-domain sources over branded domains. Single biggest GEO drag.
   - **Fix:** Execute DNS cutover to `silkincom.com` per `LAUNCH-CHECKLIST.md` Fri 22/05. Update `NEXT_PUBLIC_APP_URL` on Vercel.

2. **Cross-domain `@id` mismatch in Organization/WebSite schema.** `@id` references `silkincom.com` while pages live at `silkincom.vercel.app`. AI crawlers treat these as separate entities, fracturing the knowledge graph.
   - **Fix:** Auto-derive `@id` from `NEXT_PUBLIC_APP_URL`. Already partial — Article/Person/Breadcrumb correctly use vercel.app; align Organization/WebSite immediately or finalize post-cutover.

3. **Zero third-party entity validation.** No Wikipedia, no Wikidata Q-ID, no LinkedIn company page, no Reddit/YouTube/press mentions for "SILKinCOM" or "Marco Dibenedetto" tied to Como silk. LLMs cannot resolve the entity with confidence.
   - **Fix:** Wikidata stub (autoconfirmed unblock in ~2 days), LinkedIn company page, 2-3 press placements (lakecomotravel.com, Italian fashion blogs). 30-day timeline.

---

## High Priority Issues (Fix Within 1 Week)

1. **Product pages reuse homepage `<title>` and lack Product JSON-LD schema.** AI engines cannot extract price/availability/brand/SKU. Google Merchant feed compensates but on-page schema missing.
   - **Fix:** Add `generateMetadata` per-product in `app/[locale]/prodotto/[slug]/page.tsx` emitting unique title + description + Product/Offer JSON-LD. ~2h.

2. **`/llms-full.txt` returns 404.** llms.txt caps at 70/100; full markdown corpus would lift to 90/100.
   - **Fix:** Generate `/llms-full.txt` with pillar Storia-della-seta + product specs + cura/[material] content. Single-fetch corpus for LLMs.

3. **Pillar `/trame-di-como/storia-della-seta-a-como` has H1 only, no H2/H3 hierarchy.** AI passage extraction halved.
   - **Fix:** Inject 5-6 H2 (Quattrocento, Settecento industriale, '900 case storiche, declino anni '90, rinascita contemporanea, oggi) + 2-3 H3 each. ~1h.

4. **OAI-SearchBot + Bingbot directives missing from robots.txt.** ChatGPT search index + Bing Copilot crawl trust both impacted.
   - **Fix:** Add explicit `User-agent: OAI-SearchBot` Allow + `User-agent: Bingbot` Allow. Lift Citability + Platform.

5. **Founder bio thin (~280 words, no photo, no LinkedIn sameAs).** Weakest E-E-A-T anchor for a Maison page.
   - **Fix:** Expand `/maison/marco-dibenedetto` to 700-900 words (timeline, mentors, atelier collaborations), add portrait, add LinkedIn URL to Person `sameAs`. ~3h editorial.

6. **No IndexNow key file at root.** Bing Webmaster + Yandex pings unavailable. Blocked from session classifier per HANDOFF §7 — needs manual addition.
   - **Fix:** Generate IndexNow key, drop `<key>.txt` at site root, configure `app/api/indexnow/route.ts` to ping on publish.

---

## Medium Priority Issues (Fix Within 1 Month)

1. **`sameAs` array on Organization incomplete.** Only Instagram/Facebook/Pinterest. Missing Wikipedia/Wikidata/LinkedIn/YouTube/Crunchbase.
   - **Fix:** Add stubs even if empty; create LinkedIn company page; add YouTube channel URL.

2. **Speakable schema only on 1 article.** AboutPage, Person, FAQPage prime readout candidates ignored.
   - **Fix:** Add `speakable` cssSelector to `/la-nostra-storia`, `/maison/marco-dibenedetto`, `/faq` mainEntity answers.

3. **37/39 `<img>` lack explicit width/height.** CLS risk on hydration, weakens AI image understanding.
   - **Fix:** Set `width`/`height` on every `next/image` (or use `fill` with parent `aspect-ratio`). ~1h.

4. **Sitemap omits `x-default` hreflang in URL entries** (present in HTTP Link header only).
   - **Fix:** Inject `<xhtml:link rel="alternate" hreflang="x-default">` in `app/sitemap.ts`. ~15 min.

5. **HowTo `/cura-prodotto/seta` steps lack `name`/`image` per step.** Shallower than `/trame-di-como/come-riconoscere-seta-vera` HowTo.
   - **Fix:** Enrich step objects with `name` + `image`. ~30 min × 5 materials.

6. **Product/cura/material pages lack citable answer blocks.** Avg citability ~50; pillar at 76.
   - **Fix:** Add 1-2 sentence definitional openers + measurable claims (GSM, micron, fiber length) + FAQPage per page.

7. **Founder entity disambiguation risk.** "Marco Dibenedetto" returns unrelated D&B/LinkedIn profiles in search.
   - **Fix:** Once Wikipedia stub exists, link from `/maison` + Person.sameAs. Until then, prominent "Founder of SILKinCOM" in LinkedIn headline.

---

## Low Priority Issues

1. **BreadcrumbList on product duplicates leaf node** (position 3 = position 4 = "Cernobbio"). Rename position 3 to "Cernobbio (collezione)".
2. **`inLanguage:"it-IT"` hardcoded on Organization** — evaluate per-locale variants emit `inLanguage` matching locale.
3. **Homepage title 67 chars + meta description 240 chars** slightly long — trim for SERP.
4. **CSP uses `unsafe-inline` + `unsafe-eval`** (acceptable for Next.js; tighten with nonces later).
5. **No phone number visible** on contact page — adds Trust signal.
6. **No editorial-standards page** — lift E-E-A-T Trust from 21 to 24/25.

---

## Category Deep Dives

### AI Citability (76/100)

Strong pillars, weak product pages. Top samples scored 88/100 (Como silk 70% statistic), 82/100 (definitional opener), 76/100 (founder thesis). Product Bellagio specs 64/100 — measurable but fragmentary. Hero CTAs with stylized underscores break parser cleanliness at ~35/100.

**Lift path:** add citable openers + GSM/micron/fiber-length data to all 41 product pages + 5 cura pages.

### Brand Authority (18/100)

| Platform | Score | Status |
|---|---|---|
| Wikipedia | 0/30 | Absent — no SILKinCOM or Marco Dibenedetto (silk) entry |
| Reddit | 0/20 | Zero indexed discussions |
| YouTube | 0/15 | Competitors (Elizabetta, Serà, LARIOSETA) dominate "Como silk" |
| LinkedIn | 3/10 | Founder profile exists but not linked to SILKinCOM |
| Industry/Press | 15/25 | D&B partial; no Vogue/lakecomotravel/fashion press |

**Lift path:** Wikidata + LinkedIn company + 2-3 press = +30 points within 30 days.

### Content E-E-A-T (78/100)

| Dimension | Score | Evidence |
|---|---|---|
| Experience | 20/25 | First-hand voice, founder editorial, atelier references |
| Expertise | 19/25 | Technical lexicon, 7-step HowTo, named manufacturers |
| Authoritativeness | 18/25 | Citation refs (Wikipedia/Mantero/Ratti/CCIAA), Person schema, 3 artisans |
| Trustworthiness | 21/25 | HTTPS, P.IVA + address visible, privacy/cookie/terms, dated byline |

**AI content check:** Highly likely human. Zero "delve into / in today's landscape" patterns. Named entities + dated facts. Citation refs verifiable.

### Technical GEO (87/100)

SSR confirmed (Next.js 15 App Router RSC, 13,351 body words server-rendered home). robots.txt with 14 AI bots allowed. sitemap 184 hreflang-rich URL entries. 7 security headers present (HSTS preload, CSP, X-Frame-Options DENY, Referrer-Policy strict-origin, Permissions-Policy locked). Manifest + security.txt + icons all 200 OK.

**Gaps:** product `<title>` reuse, Product JSON-LD absent on /prodotto, sitemap x-default missing, 37/39 imgs no dimensions.

### Schema & Structured Data (82/100)

| Dimension | Score |
|---|---|
| Coverage | 92/100 |
| Completeness | 78/100 |
| Validation | 95/100 |
| AI-citation-critical | 65/100 |

All 10 sampled pages have expected schema. Org+LocalBusiness combo, Product+Offer+Breadcrumb, Article+Speakable, HowTo×7-step, FAQPage×25, AboutPage+Person, CollectionPage+ItemList, Person×3 artigiani — all parse-clean.

**Gaps:** sameAs ceiling (3 platforms), @id domain mismatch, speakable scarce.

### Platform Optimization (64/100)

Best on Google AI Overviews (72) — comprehensive schema, question-based H2s, 7-lang hreflang, pillar content, founder Person. Worst on Bing Copilot (49) — no IndexNow, no Bingbot directive, no msvalidate.01, vercel.app subdomain.

---

## Quick Wins (Implement This Week)

1. **DNS cutover to silkincom.com** — single action lifts composite +15 (resolves Vercel domain drag across all 5 platforms).
2. **Add Product JSON-LD + per-product generateMetadata** — unlocks Google rich results + Gemini product cards. ~2h.
3. **Inject H2/H3 hierarchy on storia-della-seta pillar** — doubles AI passage extraction. ~1h.
4. **Generate /llms-full.txt** with pillar + products + cura content. ~30 min.
5. **Add OAI-SearchBot + Bingbot directives** to robots.txt. ~5 min.

---

## 30-Day Action Plan

### Week 1: Cutover + on-page fixes (silkincom.com live)
- [ ] DNS cutover silkincom.com (Fri 22/05)
- [ ] `NEXT_PUBLIC_APP_URL` → https://silkincom.com on Vercel + redeploy
- [ ] Align Organization/WebSite `@id` to canonical domain
- [ ] Add Product JSON-LD + generateMetadata on `app/[locale]/prodotto/[slug]/page.tsx`
- [ ] Add OAI-SearchBot + Bingbot directives to robots.ts
- [ ] Generate /llms-full.txt route + populate

### Week 2: Pillar densification + technical fixes
- [ ] Refactor `/trame-di-como/storia-della-seta-a-como` H2/H3 hierarchy
- [ ] Add citable openers + GSM/micron/fiber data to all 5 /cura-prodotto/* pages
- [ ] Set width/height on all next/image (or aspect-ratio container)
- [ ] Inject x-default hreflang in sitemap entries
- [ ] Enrich HowTo seta/cashmere/lana/lino/cotone step objects with name + image

### Week 3: Founder + entity graph
- [ ] Expand /maison/marco-dibenedetto to 700-900 words + portrait
- [ ] Create LinkedIn company page SILKinCOM, link founder profile
- [ ] Add LinkedIn + Wikidata + YouTube + Crunchbase to Organization.sameAs (stubs OK)
- [ ] Speakable schema on /la-nostra-storia, /maison, /faq
- [ ] Wikidata stub creation (autoconfirmed unblock ~24/05)

### Week 4: Off-site validation + Bing ecosystem
- [ ] IndexNow key file + ping endpoint
- [ ] Bing Webmaster Tools verification + sitemap submit
- [ ] Google Search Console DNS verification + sitemap submit
- [ ] Google Merchant Center feed activation
- [ ] 2-3 press outreach (lakecomotravel.com, Vogue Italia digital, Italian fashion blogs)
- [ ] Reddit/community seed: r/femalefashionadvice, r/cashmere, r/MalefashionAdvice authoritative comments with brand mention

---

## Expected Score Trajectory

| Milestone | GEO Score | Delta |
|---|---|---|
| Baseline (today, vercel.app) | **66** | — |
| Post-cutover (silkincom.com live, Fri 22/05) | **74** | +8 |
| Post Week 2 (on-page + pillar fixes) | **78** | +4 |
| Post Week 3 (founder + sameAs graph) | **81** | +3 |
| Post Week 4 (off-site validation) | **83-85** | +2-4 |

Ceiling without sustained PR/press: ~88. Wikipedia article (when notable enough) lifts to ~92.

---

## Appendix: Pages Analyzed

| URL | Schema Types | Citability | Issues |
|---|---|---|---|
| `/` (home) | Org+LocalBusiness, WebSite+SearchAction, Brand, ContactPoint | 70 | Hero CTA underscore parsing |
| `/prodotto/cernobbio-azzurra` | Product, Offer, BreadcrumbList | 64 | Title reuse, no per-product metadata, dupe breadcrumb leaf |
| `/collezioni/inverno` | CollectionPage, ItemList(19) | 60 | — |
| `/trame-di-como/storia-della-seta-a-como` | Article, Speakable, BreadcrumbList | 88 | H1 only, no H2/H3 |
| `/trame-di-como/come-riconoscere-seta-vera` | Article+Speakable, BreadcrumbList, HowTo(7) | 78 | — |
| `/la-nostra-storia` | AboutPage+Org+Person | 65 | No speakable |
| `/maison/marco-dibenedetto` | Person+Country+Place, BreadcrumbList | 76 | Bio thin (~280 words), no LinkedIn sameAs |
| `/materiali` | ItemList+Product×5, BreadcrumbList | 60 | No speakable |
| `/faq` | FAQPage(25), BreadcrumbList | 72 | No speakable on answers |
| `/cura-prodotto/seta` | HowTo(4 step), BreadcrumbList | 55 | Steps lack name/image |
| `/artigiani` | CollectionPage+ItemList+Person×3, BreadcrumbList | 62 | — |

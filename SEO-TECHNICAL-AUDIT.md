# SILKinCOM — Technical SEO + Schema Audit

**Target:** https://silkincom.vercel.app
**Date:** 2026-05-09
**Stack:** Next.js 15 (App Router, SSR confirmed via `__next_f` streaming + full HTML in initial response)

---

## Overall Technical Score: **74 / 100** — Good (with critical multilingual gap)

| Category | Score | Weight | Status |
|---|---|---|---|
| Server-Side Rendering / JS Dependency | 95 | 25% | PASS |
| Meta Tags & Indexability | 88 | 15% | PASS |
| Crawlability (robots, sitemap, hreflang) | 45 | 15% | **CRITICAL** |
| Security Headers | 95 | 10% | PASS |
| Core Web Vitals (static risk) | 70 | 10% | MEDIUM |
| Mobile Optimization | 90 | 10% | PASS |
| URL Structure | 85 | 5% | PASS |
| Response Headers & Status | 80 | 5% | PASS |
| Schema.org coverage | 40 | 5% | **HIGH** |

---

## 1. Robots.txt — 90/100
- Found at `/robots.txt`. References sitemap correctly.
- Granular per-bot rules (Googlebot, GPTBot, ClaudeBot, PerplexityBot etc.) — all permitted on public content; disallow `/admin/`, `/api/`, `/account/`, `/checkout/`, `/cart/`, `/(auth)/`. Good.
- **MEDIUM:** `/(auth)/` literal is a Next.js route-group path that does not exist in the URL space — useless directive (cosmetic).

## 2. Sitemap.xml — 60/100
- 73 URLs, all `lastmod` identical (`2026-05-08T22:51:55Z`) — auto-regenerated, weakens lastmod signal.
- **CRITICAL:** No `<xhtml:link rel="alternate" hreflang="...">` entries despite 7 locales. AI/Google cannot map locale variants from the sitemap.
- Fix: emit per-URL alternates in `src/app/sitemap.ts` (or wherever sitemap is generated).

## 3. Meta Tags — 88/100
- Title (74 chars — slightly over 60), description (256 chars — over 160), canonical, OG (full set + dimensions), Twitter `summary_large_image`, viewport, `<html lang="it">`, robots `index,follow` — all present and well-formed.
- **MEDIUM:** Description too long (will be truncated in SERP).
- **MEDIUM:** `og:url` = `silkincom.com` while canonical = `silkincom.vercel.app` — mismatch will confuse crawlers.
- **LOW:** Title 74 chars — trim to ~60.

## 4. Hreflang — **20/100 — CRITICAL**
All seven `<link rel="alternate" hreflang>` tags point to **the same URL** (`https://silkincom.vercel.app`). No `/en`, `/es`, `/fr`, `/de`, `/pt`, `/nl` prefixes resolve (`/en` returns 404). This means:
- Multilingual is effectively not deployed, OR
- Locale routing is missing from `middleware.ts` / `next.config`.

Fix path: `src/middleware.ts` and `src/app/[locale]/...` — verify locale segment exists; update `generateMetadata` to emit locale-specific `hreflang` URLs.

## 5. Schema.org — **40/100 — HIGH**
Detected on homepage:
- `WebSite` + `SearchAction` — OK
- `Brand` (with `PostalAddress`, `GeoCoordinates`, `Person`) — OK but unusual; should be `Organization` (or `LocalBusiness`/`Store`) as the root entity, with `brand` nested.

**Missing (HIGH):**
- `Organization` / `LocalBusiness` (you have a Como address — use `Store` or `LocalBusiness` with `priceRange`, `openingHoursSpecification`).
- `Product` + `Offer` on every product page (41 product URLs in sitemap — 0 product schemas detected on `/collezioni/bellagio`).
- `BreadcrumbList` on category/product pages.
- `Article` on the 4 `/trame-di-como` blog posts.
- `FAQPage` on `/faq`.

Files to create/edit:
- `src/app/[locale]/prodotto/[slug]/page.tsx` — add JSON-LD `Product`+`Offer`+`AggregateRating`.
- `src/app/[locale]/collezioni/[slug]/page.tsx` — add `BreadcrumbList` + `CollectionPage`.
- `src/app/[locale]/trame-di-como/[slug]/page.tsx` — add `Article`.
- `src/app/layout.tsx` — replace root `Brand` JSON-LD with `Organization`/`LocalBusiness`.

## 6. Security Headers — 95/100
| Header | Value | Status |
|---|---|---|
| HTTPS | yes | PASS |
| HSTS | `max-age=31536000; includeSubDomains; preload` | PASS |
| CSP | full policy with Stripe/Supabase/Maps allowlist | PASS |
| X-Frame-Options | `DENY` | PASS |
| X-Content-Type-Options | `nosniff` | PASS |
| Referrer-Policy | `strict-origin-when-cross-origin` | PASS |
| Permissions-Policy | camera/mic/geo restricted | PASS |

**MEDIUM:** CSP includes `'unsafe-inline'` and `'unsafe-eval'` for scripts — tighten with nonces (Next 15 supports CSP nonce in middleware).

## 7. Core Web Vitals (static risk) — 70/100
- LCP: hero image preloaded with `fetchPriority` — GOOD. 3 fonts preloaded (woff2). LOW risk.
- INP: 16 distinct JS chunks linked from `<head>` — typical Next 15 App Router. MEDIUM risk; recommend `next build --analyze` to verify total JS < 200 KB gzip on home route.
- CLS: `next/image` with srcset is in use — provides intrinsic dimensions. LOW risk.
- **MEDIUM:** `cache-control: private, no-cache, no-store, max-age=0, must-revalidate` on the HTML — disables CDN HTML caching. Switch to `s-maxage=60, stale-while-revalidate=86400` for SSG-eligible pages. File: route handlers / `revalidate` exports.

## 8. Accessibility — 85/100
- 0/39 `<img>` tags missing `alt`. PASS.
- One `<h1>` per page. PASS.
- `<html lang="it">` set. PASS.
- Color contrast not verifiable from HTML — recommend Lighthouse pass on staging.

## 9. Crawlability & Internal Linking — 75/100
- SSR confirmed: full HTML body present, `__next_f` streamed payload + statically rendered nav. AI crawlers (no JS) WILL see content.
- Internal nav uses `/collezioni`, `/materiali`, `/trame-di-como` etc. — clean, semantic, no params.
- Canonical self-referencing — PASS.
- **CRITICAL:** Localized URLs not reachable (see §4).

## 10. URL Structure — 85/100
Italian slugs (`/collezioni/bellagio`, `/cura-prodotto`) — clean, lowercase, hyphenated, ≤4 levels deep, keyword-rich. Good.

---

## Priority Action List

1. **[CRITICAL]** Fix hreflang: implement locale routing in `src/middleware.ts` + `src/app/[locale]/layout.tsx`; emit per-locale URLs in `generateMetadata().alternates.languages`. Verify `/en`, `/fr`, `/de`, `/es`, `/pt`, `/nl` return 200.
2. **[CRITICAL]** Add hreflang alternates to sitemap (`src/app/sitemap.ts`).
3. **[HIGH]** Add `Product`+`Offer` JSON-LD on all 41 product pages.
4. **[HIGH]** Add `BreadcrumbList` site-wide; `Article` on blog; `FAQPage` on /faq; `LocalBusiness` in root layout.
5. **[HIGH]** Reconcile `og:url` vs `canonical` (pick `silkincom.vercel.app` until production domain is live, then switch both).
6. **[MEDIUM]** Tighten CSP — drop `'unsafe-eval'`, use nonces for inline scripts.
7. **[MEDIUM]** Trim meta description to ≤160 chars; title ≤60 chars.
8. **[MEDIUM]** Enable HTML edge caching (`revalidate` + `s-maxage`).
9. **[MEDIUM]** Vary `lastmod` per URL based on real content updates.
10. **[LOW]** Remove `/(auth)/` from robots.txt (no-op).

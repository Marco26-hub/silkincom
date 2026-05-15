# SILKinCOM — Master Marketing Audit
**URL:** https://silkincom.vercel.app
**Date:** 2026-05-09
**Business Type:** E-commerce — Luxury Italian Silk/Cashmere Accessories (Made in Como)

---

## Composite Score: **63/100 — Grade C**

Calculated as weighted average of 4 specialist audits.

| Domain | Score | Grade | Report |
|---|---|---|---|
| Marketing & Conversion | 65/100 | C+ | [MARKETING-AUDIT.md](./MARKETING-AUDIT.md) |
| GEO / AI Citability | 47/100 | F+ | [GEO-CITABILITY-AUDIT.md](./GEO-CITABILITY-AUDIT.md) |
| Technical SEO | 74/100 | B | [SEO-TECHNICAL-AUDIT.md](./SEO-TECHNICAL-AUDIT.md) |
| Competitive Position | 66/100 | C+ | [COMPETITORS-AUDIT.md](./COMPETITORS-AUDIT.md) |

---

## Executive Summary

SILKinCOM has **strong foundations** (luxury aesthetic, Made in Como geographic anchor, multilingual infrastructure, SSR + security) but **leaks revenue across 4 critical layers**:

1. **Anonymous brand** — no founder, no team, no faces. Fatal for luxury heritage positioning where competitors (Marinella, Cordone 1956, Faliero Sarti) lead with named families.
2. **Zero social proof** — no reviews, no press, no UGC. Conversion ceiling.
3. **AI invisible** — not recognized as entity by ChatGPT/Claude/Perplexity. Wikipedia=0, Reddit=0, YouTube=0, LinkedIn=0.
4. **Hreflang broken** — 7-language infrastructure built but `/en /fr /de /es /pt /nl` return 404. International growth blocked.

**Total revenue opportunity:** **€31k–€76k/month** (€370k–€910k/year) via prioritized fixes below.

---

## TOP 10 PRIORITY ACTIONS

### Critical (this week, technical)
1. **Fix hreflang routing** — `/en /fr /de /es /pt /nl` all 404. Repair `src/middleware.ts` + `src/app/[locale]/layout.tsx`.
2. **Sitemap hreflang alternates** — add `xhtml:link` to 73 URLs in `src/app/sitemap.ts`.
3. **Reconcile shipping terms** — homepage says €200/4-7d, llms.txt says €100/2-4d. Pick one.
4. **Fix og:url mismatch** — points to `silkincom.com` while canonical is `.vercel.app`.

### High (this week, marketing)
5. **Reviews integration** — Judge.me or Yotpo on product pages. +€2-5k/mo CVR lift.
6. **Free-shipping threshold to €150** — current €200 above AOV €70-150.
7. **Add Product/Article/BreadcrumbList schemas** — 41 product pages + 4 articles missing structured data.

### Strategic (this month)
8. **B2B/Hospitality landing** — outreach to 50 Lake Como hotels. Highest single revenue line.
9. **Founder + atelier story** — named humans on PDPs, /la-nostra-storia. Beats Etro/Ferragamo on authenticity.
10. **Klaviyo lifecycle flows** — welcome, abandoned cart, post-purchase, winback. Unlocks 15-25% revenue.

### Long-term (this quarter)
- Wikipedia stub + LinkedIn Company page (entity recognition)
- "Trame di Como" SEO moat — long-form journal with named artisans
- Bespoke service productization (4-6 weeks, "from €350")

---

## Pricing Recommendations (vs competitors)

| Tier | Current | Recommended | Rationale |
|---|---|---|---|
| Entry twilly | n/a | **€85–€95** | Missing rung; gateway SKU |
| Core scarf | varies | **€120–€140** | Sweet spot above mall, below Faliero |
| Premium carré | varies | **€160–€190** | Anchor against Etro €280 |
| Limited halo | n/a | **€280–€350** | Aspirational halo SKU |
| Bespoke | n/a | **from €350** | PR/content flywheel |
| Free ship IT | €200 | **€150** | Match Mantero, above AOV |

---

## Differentiation Plays (vs Marinella/Faliero/Mantero/Etro)

1. **Own *artisan* Como** — Mantero/Ratti are industrial, SILKinCOM can be local hero
2. **"First serious silk" band €90-€180** — under-served gap
3. **4-6 week bespoke** as content/PR engine
4. **Trame di Como** as SEO moat (long-form, named artisans)
5. **Founder + atelier on every PDP** — beats global maisons on authenticity

---

## Detailed Reports

- **[MARKETING-AUDIT.md](./MARKETING-AUDIT.md)** — Full 6-category scoring + revenue impact per recommendation
- **[GEO-CITABILITY-AUDIT.md](./GEO-CITABILITY-AUDIT.md)** — AI search readiness (ChatGPT/Claude/Perplexity)
- **[SEO-TECHNICAL-AUDIT.md](./SEO-TECHNICAL-AUDIT.md)** — Technical SEO + schema gaps with file paths
- **[COMPETITORS-AUDIT.md](./COMPETITORS-AUDIT.md)** — 7-competitor benchmark + positioning gaps

*Audit run: 2026-05-09 via `/market-audit` orchestrator.*

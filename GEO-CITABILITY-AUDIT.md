# GEO / AI Visibility Audit — SILKinCOM

**Target:** https://silkincom.vercel.app
**Brand:** SILKinCOM — Luxury Italian silk & cashmere accessories, 100% Made in Como
**Audit date:** 2026-05-09

---

## AI Visibility Score: 47 / 100 — Fair

Significant gaps in entity recognition and brand authority offset solid technical foundations.

### Score Breakdown

| Component | Score | Weight | Weighted |
|---|---|---|---|
| Citability | 62 / 100 | 35% | 21.7 |
| Brand Mentions | 8 / 100 | 30% | 2.4 |
| Crawler Access | 90 / 100 | 25% | 22.5 |
| llms.txt | 70 / 100 | 10% | 7.0 |
| **Total** | | | **53.6 → 47*** |

*Adjusted downward 6 pts for severe entity-recognition gap (no Wikipedia, no Reddit, no LinkedIn footprint detected for a luxury commerce brand).

---

## 1. Citability Assessment — 62 / 100

**Page Citability Score:** 62 (avg of top 5 blocks)

### Citation-ready passages (score ≥70)

1. **Materials block** — "Como silk tradition since 15th century; Cashmere 14-16 micron; Extra-long cotton 35mm+; European linen from France/Belgium." — **Score 82**. Strong: specific measurements, geographic specificity, self-contained.
2. **Product specs table** — Bellagio €120 / 180×45 cm 100% Cashmere; Cernobbio €150 / 190×35 cm; Tremezzo €70 / 190×35 cm Wool; Varenna €120. — **Score 78**. Tabular, numeric, scannable.
3. **Heritage statement** — "Sei secoli di tradizione tessile comasca... distretto serico dal 1400" — **Score 74**. Quotable, dated, geographic anchor.
4. **Service terms** — "Free shipping Italy over €200; EU 4–7 days; 14-day returns with home pickup; Atelier Privé 4–6 week bespoke turnaround." — **Score 72**. Numerically dense, factual.
5. **Brand identity line** — "Maison italiana di accessori in seta, cashmere e fibre naturali pregiate, 100% Made in Como (Cermenate)." — **Score 70**. Definitional, includes founder/HQ.

### Citation-unlikely areas (score <30)

- Marketing-poetic copy ("L'eleganza del lago, tessuta a Como"; "Ogni filo ha una memoria") — evocative but unanchored, 22.
- Newsletter / social CTAs — generic, 18.

### Conflict flag

Two service-term variants appear across page and llms.txt:
- Page: "Free shipping Italy over €200, EU 4–7 days"
- llms.txt: "Free EU shipping over €100, 2–4 business days"
This inconsistency will cause AI assistants to hedge or quote the wrong version. **Fix: align both sources.**

### Recommendations
- Add a structured FAQ block (5–10 Q&A pairs) — currently only nav reference exists.
- Add an "About / Founder" passage with Marco Dibenedetto, Cermenate HQ, founding year, VAT 03786590133 — establishes entity facts AI can quote.
- Embed Schema.org `Product`, `Organization`, and `FAQPage` JSON-LD.
- Add at least one numeric proof passage (e.g. "X scarves produced annually," "Y master weavers").

---

## 2. AI Crawler Access — 90 / 100

`/robots.txt` exists and explicitly enumerates the major AI user-agents — significantly above industry norm.

| Crawler | Status | Notes |
|---|---|---|
| GPTBot | Allowed (with /admin/, /api/, /account/, /checkout/ disallowed) | Good |
| OAI-SearchBot | Not explicitly listed — inherits `*` rules | Add explicit rule |
| ChatGPT-User | Allowed (with same restrictions) | Good |
| ClaudeBot | Allowed | Good |
| Claude-Web | Allowed | Good |
| anthropic-ai | Allowed | Good |
| PerplexityBot | Allowed | Good |
| Google-Extended | Allowed (Gemini training) | Good |
| Applebot-Extended | Allowed | Good |
| CCBot | Allowed | Good |
| cohere-ai | Allowed | Good |
| Bytespider | Allowed | Good |
| Amazonbot | Allowed | Good |
| Googlebot | Most permissive (only /admin/, /api/) | Good |

**Sitemap referenced:** `https://silkincom.vercel.app/sitemap.xml` ✓
**Host directive set** ✓

### Issues
- `OAI-SearchBot` (separate from GPTBot, used by ChatGPT search) not explicitly listed.
- No explicit `Allow:` directives — relies on default-allow with disallow exceptions (acceptable but less defensive).

### Deduction
−10 for missing OAI-SearchBot explicit rule.

---

## 3. llms.txt — 70 / 100

**Status:** Present at `/llms.txt` ✓

The file responds with curated brand summary, founder name (Marco Dibenedetto), HQ (Cermenate, Como), product collections, materials with technical specs (cashmere 14–16 micron, cotton 35mm+), and service terms. This is well above the median for e-commerce sites.

### Strengths
- Names the founder and HQ city (entity grounding).
- Lists three collections explicitly.
- Includes material micron/length specs.

### Gaps
- Format compliance unclear from fetch — confirm H1 + blockquote + H2 sections + markdown link list per spec.
- No `/llms-full.txt` detected — would lift score to 90+.
- No links in `[Title](url): Description` format to deeper resources (product pages, journal posts, materials guide).
- Service terms contradict the homepage (see §1) — must reconcile.

### Recommendation
Restructure to spec, add product/material/journal link sections, and create `/llms-full.txt` containing complete product catalog and material guide as plain markdown.

---

## 4. Brand Mention Presence — 8 / 100

**This is the audit's critical failure point.**

| Platform | Status | Details |
|---|---|---|
| Wikipedia | **Absent** | API search returned 0 matches for "SILKinCOM"; top results were unrelated (Cary Silkin, Lewis Silkin LLP). |
| Reddit | **Absent** | No mentions found in web search. |
| YouTube | **Absent** | No official channel surfaced; only generic Como-silk videos. |
| LinkedIn | **Absent / Unverified** | Company page not surfaced in web search. |
| Industry sources | **Absent** | Not mentioned by Creasilk, comomilano.com, ilonatambor.com, or weeklyluxdrop luxury-silk roundups. |
| Instagram | Claimed (@silkincom.official) on site | Not corroborated by external citations. |

### Entity Recognition verdict

**SILKinCOM is NOT recognized as a brand entity by AI systems.** ChatGPT/Claude/Perplexity have no anchor point: no Wikipedia article, no Reddit discussion thread, no industry roundup, no LinkedIn presence in search index. AI models will either decline to discuss the brand or hallucinate generic Como-silk facts.

### Score components
- Wikipedia: 0 / 30
- Reddit: 0 / 20
- YouTube: 0 / 15
- LinkedIn: 0 / 10
- Industry/niche: 8 / 25 (slight credit for own-domain heritage content; no third-party validation)

---

## 5. Critical Issues, High Priority, Quick Wins

### CRITICAL (entity-recognition blockers)
1. **Create a Wikipedia presence.** Even a stub article on the company (or contributing the brand to "Como silk industry" article) is the single highest-impact GEO action. AI models weight Wikipedia disproportionately.
2. **Build LinkedIn Company page** with full description, founder profile, HQ at Cermenate, products. Requires verification, but indexed within days.
3. **Seed Reddit discussions** organically — r/femalefashionadvice, r/MaleFashionAdvice, r/Italy, r/luxury. One thread per quarter referencing the brand drives entity co-occurrence signals.

### HIGH
4. **Reconcile service-term inconsistency** between homepage (€200 / 4–7 days) and llms.txt (€100 / 2–4 days). AI quoting either will be wrong.
5. **Add Schema.org JSON-LD** (`Organization`, `Product`, `FAQPage`, `BreadcrumbList`).
6. **Get listed on third-party luxury directories** (Vogue's Como guide, weeklyluxdrop, comomilano.com partner pages, Italian artisan registries like Fondazione Cologni).
7. **Add an "About / Founder" page** with full company facts (founding year, founder bio, master weaver count, atelier address, certifications).

### QUICK WINS
8. **Add explicit `OAI-SearchBot` rule** in robots.txt (1 line, +5 visibility points).
9. **Create `/llms-full.txt`** mirroring full catalog and material guide (1 file, +20 llms.txt points).
10. **Create dedicated FAQ page** with 8–12 Q&A pairs structured for citation (sizes, materials, shipping, returns, care, bespoke, gift packaging, VAT/EU compliance).
11. **Publish 2–3 long-form Journal articles** with proprietary data (e.g. "Why Cermenate — the chemistry of Como silk dye works") — gives AI something distinctive to cite.
12. **Set up a YouTube channel** with 3–5 atelier videos showing hand-finishing — creates direct YouTube citation surface.
13. **Submit press release** to Italian luxury/fashion press (Vogue Italia, Il Sole 24 Ore Moda, MFFashion) — creates third-party citation foundation.

---

## Summary

SILKinCOM has done the **technical** GEO work better than most luxury e-commerce sites — explicit AI bot allowlist in robots.txt, a present llms.txt, structured product data on-page. The on-site content is moderately citable.

The single binding constraint is **entity recognition**: with zero Wikipedia / Reddit / LinkedIn / YouTube / third-party industry footprint, the brand is invisible to the corpus AI models are trained on and the live sources they retrieve. Until off-site authority is built, on-site improvements compound slowly.

**Prioritize off-site presence (Wikipedia + LinkedIn + 2 industry placements) over further on-site optimization** for the next 60 days.

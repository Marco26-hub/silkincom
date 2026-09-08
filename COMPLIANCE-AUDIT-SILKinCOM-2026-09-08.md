# Compliance Gap Analysis Report

> ⚠️ LEGAL DISCLAIMER: This analysis is AI-generated and does not constitute legal advice. Always consult a licensed attorney. This audit is based on automated surface-level scanning plus source-code inspection, and may not detect all compliance issues.

**Website:** https://www.silkincom.com
**Scan Date:** 2026-09-08
**Scanned Pages:** `/` (homepage), `/privacy-policy`, `/cookie-policy`, `/termini` — plus source-code verification of the cookie banner (`CookieBanner.tsx`) and analytics consent gating (`Analytics.tsx`).

---

## Compliance Scorecard

| Framework | Score | Grade | Status |
|-----------|-------|-------|--------|
| GDPR | 67% | C | ⚠️ Gaps Found |
| CCPA/CPRA | — | — | ➖ Not applicable (below thresholds) |
| ADA/WCAG (+ EU EAA) | 61% | C | ⚠️ Gaps Found |
| PCI-DSS | 75% | B | ✅ Good with minor gaps |
| CAN-SPAM | 80% | B | ✅ Good with minor gaps |
| COPPA | — | — | ➖ Not applicable (not child-directed) |
| SOC 2 | — | — | ➖ Not applicable (not B2B SaaS) |
| **Overall** | **~70%** | **C** | ⚠️ Moderate gaps, no critical exposure |

### Grade Scale
| Grade | Score | Meaning |
|-------|-------|---------|
| A | 90-100% | Strong compliance posture |
| B | 75-89% | Good with minor gaps |
| C | 60-74% | Moderate gaps requiring attention |
| D | 40-59% | Significant compliance risks |
| F | 0-39% | Critical compliance failures |

---

## Executive Summary

SILKinCOM has a **solid compliance foundation** for a small Italian e-commerce: a real cookie consent banner that genuinely blocks GA4/Meta until the user accepts (verified in source, not just claimed), a structured GDPR privacy policy with legal bases, data-subject rights, named third parties and SCC transfer safeguards, a proper cookie policy with categories, and complete terms with seller identity, VAT and 14-day right of withdrawal. **There is no critical, active legal exposure.**

The gaps are moderate. The most important is **no way for a visitor to change or withdraw cookie consent** after their first choice — GDPR requires withdrawal to be as easy as granting it, and "delete the cookies from your browser" (what the policy currently says) does not satisfy this. Second, the **full company postal address is not shown in the footer** (only "Como · Italia"), though it is present via VAT in the terms. Third, **accessibility** should be taken seriously now that the EU Accessibility Act (in force since 28 June 2025) applies to e-commerce — the site needs a real WCAG audit and an accessibility statement.

**Detected technologies (from privacy/cookie policy + code):** Stripe (payments), Vercel (hosting), Resend (transactional email), Google Analytics 4, Google Ads, Meta Pixel, Google Ireland Ltd., Meta Platforms Ireland Ltd. Payment wallets: Apple Pay, Google Pay, PayPal, bank transfer.

**Applicable frameworks:** GDPR (EU/Italy — primary), ADA/WCAG + EU EAA (any website / EU e-commerce), PCI-DSS (card payments), CAN-SPAM + ePrivacy (email marketing). **Not applicable:** CCPA/CPRA (business is far below the $25M revenue / 100K-consumer / data-sale thresholds), COPPA (not directed at children), SOC 2 (product e-commerce, not a B2B SaaS data processor).

---

## 🔴 Critical Issues (Fix Immediately)

**None.** No check surfaced active enforcement-level exposure. The cookie banner is present and correctly gates non-essential trackers; CCPA's "Do Not Sell" link does not apply because CCPA thresholds are not met.

---

## 🟡 High Priority Issues (Fix Within 30 Days)

### Cookie consent cannot be changed or withdrawn
- **Framework:** GDPR (ePrivacy) — check **G12**
- **Current State:** After the first Accept/Reject, the choice is stored in `localStorage` and the banner never returns. The cookie policy tells users to "modify preferences by deleting cookies from the browser."
- **Required:** Withdrawing consent must be as easy as giving it (Art. 7(3) GDPR) — a persistent, always-reachable control.
- **Risk:** Common subject of Garante Privacy (Italian DPA) complaints; the single most-cited cookie-banner defect.
- **Fix:** Add a permanent **"Preferenze cookie"** link in the footer that clears the `silkincom-cookie-consent` key and re-opens `CookieBanner`. Update the cookie policy to point to it instead of "delete cookies yourself."
- **Estimated Effort:** Low

### No granular per-category cookie control
- **Framework:** GDPR (ePrivacy) — check **G2**
- **Current State:** Banner is binary Accept-all / Reject-all (verified in `CookieBanner.tsx`). Good that Reject is present and prominent; but no per-category (analytics vs marketing) toggle.
- **Required:** Best practice / Garante guidance favours category-level choice.
- **Fix:** Extend the banner with per-category switches (essential always on; analytics; marketing) and store a structured consent object. Pair with the withdrawal fix above.
- **Estimated Effort:** Medium

### Full company postal address not shown on-site
- **Framework:** CAN-SPAM (S2) + Italian transparency (art. 12-13 Codice Consumo / D.lgs 70/2003)
- **Current State:** Footer shows only "Como · Italia". Full identity (Marco Dibenedetto, P.IVA 03786790133) appears in `/termini` but not the footer or email footers.
- **Required:** A valid physical postal address must be readily available (and in commercial emails).
- **Fix:** Add full registered address to the footer and email templates: **Marco Dibenedetto — SILKinCOM, Via Giuseppe Verdi 2/B, 22072 Cermenate (CO), Italia — P.IVA IT03786790133.**
- **Estimated Effort:** Low

### Accessibility not verified; EU Accessibility Act now applies
- **Framework:** ADA/WCAG + **EU EAA (in force 28 Jun 2025)** — checks A1–A10
- **Current State:** `lang` attribute set and responsive layout confirmed; alt text present on product images. Contrast, keyboard navigation, heading order and full alt coverage not verified. No accessibility statement.
- **Required:** WCAG 2.1 AA is the de-facto EAA standard for e-commerce sold to EU consumers.
- **Fix:** Run an automated audit (axe DevTools / WAVE / Lighthouse) on homepage, product page and checkout; fix contrast + keyboard issues; publish an **accessibility statement** page.
- **Estimated Effort:** Medium

---

## 🟡 Medium Priority Issues (Fix Within 90 Days)

### Data portability — right stated but no mechanism
- **Framework:** GDPR — **G7**. Policy lists "portabilità" but describes no procedure. Note: the app already has `/api/account/export` — reference it in the privacy policy as the portability mechanism. Effort: Low.

### No security / trust page
- **Framework:** PCI-DSS — **P4**. No page describing payment security. Add a short "Pagamenti sicuri" section naming Stripe + PCI-DSS. Effort: Low.

### No children's-data statement
- **Framework:** GDPR — **G13**. Add one line: site not intended for minors under 16; no knowing collection of minors' data. Effort: Low.

---

## 🟢 Low Priority / Best Practices

- **G10 — Breach notification:** privacy policy does not mention the 72-hour notification to the Garante. Add a short clause. (Internal procedure; low external risk.)
- **P5 — Payment badges:** no security/wallet badges shown near checkout. Add Stripe/wallet badges for trust + conversion.
- **G8 — DPO:** no DPO listed — **not required** at this scale. Optionally state "no DPO required; privacy contact: silkincom.business@gmail.com".

---

## ✅ Passing Checks

**GDPR:** G1 consent banner blocks non-essential cookies before consent (verified: `Analytics.tsx` loads GA4/Meta only when consent = accept) · G3 privacy policy present · G4 legal bases stated (contratto / consenso / legittimo interesse) · G5 full data-subject rights listed · G6 erasure via email · G9 international transfers via EU SCCs · G14 third parties named (Stripe, Vercel, Resend, Google, Meta).

**PCI-DSS:** P1 HTTPS everywhere · P2 hosted payment fields (Stripe) · P3 no card data in URLs · P6 processor identified.

**CAN-SPAM:** S1 unsubscribe offered ("Disiscriviti in qualunque momento", double opt-in) · S3 clear sender identity · S4 no pre-checked consent.

**Cookie policy:** categories defined, banner behaviour described, GA/Meta/Ads named.

**Terms:** seller identity + VAT, 14-day recesso, EUR incl. VAT, Italian governing law, 24-month legal guarantee.

---

## Framework Detail: GDPR

| # | Check | Status | Notes |
|---|-------|--------|-------|
| G1 | Cookie consent before non-essential | ✅ | Verified in source — trackers gated on `accept` |
| G2 | Granular cookie control | ⚠️ | Binary accept/reject; no per-category |
| G3 | Privacy policy exists | ✅ | `/privacy-policy` |
| G4 | Legal basis stated | ✅ | contratto, consenso, legittimo interesse |
| G5 | Data subject rights | ✅ | accesso, rettifica, cancellazione, limitazione, portabilità, opposizione |
| G6 | Right to erasure process | ✅ | via silkincom.business@gmail.com |
| G7 | Data portability | ⚠️ | Right stated, no mechanism (app has `/api/account/export`) |
| G8 | DPO contact | ➖ | Not required at this scale |
| G9 | International transfer disclosures | ✅ | EU Standard Contractual Clauses |
| G10 | Breach notification (72h) | ❌ | Not mentioned |
| G11 | Data processing records | ➖ | Internal, not web-visible |
| G12 | Consent withdrawal | ❌ | No re-open/manage UI; "delete cookies yourself" |
| G13 | Children's data | ❌ | Not addressed |
| G14 | Third-party disclosures | ✅ | Stripe, Vercel, Resend, Google, Meta named |

## Framework Detail: CCPA/CPRA
➖ **Not applicable.** Business is below all CCPA/CPRA thresholds (revenue < $25M; < 100K California consumers; no sale of personal data as primary revenue). Revisit only if US-California scale grows materially.

## Framework Detail: ADA/WCAG (+ EU EAA)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| A1 | Alt text on images | ⚠️ | Product images have alt; full coverage unverified |
| A2 | Heading structure | ⚠️ | Not fully verified |
| A3 | Color contrast | ⚠️ | Gold-on-cream areas at risk; verify with tooling |
| A4 | Keyboard navigation | ⚠️ | Not verified |
| A5 | Form labels | ✅ | Login/newsletter forms labelled |
| A6 | Link text | ⚠️ | Not verified |
| A7 | Language attribute | ✅ | `lang` set per locale (next-intl) |
| A8 | Responsive design | ✅ | Tailwind responsive, mobile-tested |
| A9 | Video captions | ➖ | No critical on-page video |
| A10 | Accessibility statement | ❌ | Absent |

*Limitation: surface scan only — a full WCAG 2.1 AA audit needs axe/WAVE + manual testing.*

## Framework Detail: PCI-DSS

| # | Check | Status | Notes |
|---|-------|--------|-------|
| P1 | HTTPS everywhere | ✅ | Vercel TLS |
| P2 | Hosted payment fields | ✅ | Stripe (SAQ-A eligible) |
| P3 | No card data in URLs | ✅ | Stripe PaymentIntents |
| P4 | Security page | ❌ | None |
| P5 | Payment/security badges | ⚠️ | Wallets via Stripe; no badges near checkout |
| P6 | Third-party processor identified | ✅ | Stripe |

## Framework Detail: CAN-SPAM

| # | Check | Status | Notes |
|---|-------|--------|-------|
| S1 | Unsubscribe mechanism | ✅ | "Disiscriviti in qualunque momento" + double opt-in |
| S2 | Physical address | ⚠️ | In terms/VAT, not in footer or email footer |
| S3 | Clear sender identity | ✅ | SILKinCOM / Marco Dibenedetto |
| S4 | No pre-checked consent | ✅ | Explicit opt-in |
| S5 | Privacy policy email section | ⚠️ | Marketing retention noted; opt-out detail thin |

## Framework Detail: COPPA
➖ **Not applicable** — luxury silk accessories, not directed at children under 13.

## Framework Detail: SOC 2
➖ **Not applicable** — product e-commerce, not a B2B SaaS processing customer data as a service.

---

## Remediation Roadmap

### Week 1 (High)
1. [ ] Add persistent **"Preferenze cookie"** footer link that re-opens the banner (fixes G12).
2. [ ] Add full registered postal address to footer + email templates (S2).

### Month 1 (High)
1. [ ] Add per-category consent toggles to `CookieBanner` (G2); store structured consent.
2. [ ] Run axe/WAVE/Lighthouse on home + product + checkout; fix contrast/keyboard; publish accessibility statement (A3/A4/A10 + EAA).

### Quarter 1 (Medium)
1. [ ] Reference `/api/account/export` as the portability mechanism in the privacy policy (G7).
2. [ ] Add a "Pagamenti sicuri" / trust section naming Stripe + PCI-DSS (P4/P5).
3. [ ] Add children's-data statement (G13) and 72h breach clause (G10).

### Ongoing (Best Practices)
1. [ ] Re-scan after each legal-page change; keep third-party list current.

---

## Limitations of This Audit
- Evaluates publicly visible signals + inspected source for the cookie banner and analytics gating; backend data handling and internal policies were not assessed.
- Accessibility checks are surface-level; a full WCAG 2.1 AA / EAA audit requires automated tooling and manual testing.
- PCI-DSS evaluation is limited to visible indicators; full compliance requires an SAQ (SAQ-A likely, given Stripe-hosted fields).
- Not a legal audit; do not use as evidence of compliance or non-compliance.

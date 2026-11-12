# Experience verification — 2026-11-09

## Latest revision — 2026-11-12

- Screenshot issue addressed: request section is a full-width flex column, with a compact image/text introduction and three contact options above the form. No tall empty companion column. Desktop form width 1228.4 pixels in a 1440-pixel viewport; selection cards use three columns, boat formulas two.
- Short descriptive text added to all 15 interest checkboxes, four boat formulas and three logistics services. Native checkbox/radio controls retained, with stable accessible names and descriptions for experience choices. Selection is highlighted with the existing gold palette.
- Gin & Wine Experience expands the prior tasting entry; 15 distinct interests remain. Wine and/or gin tastings and producer visits are proposals requiring venue/operator confirmation.
- Synthetic preview selected Gin & Wine, gourmet, Como Silk Experience, airport/station pickup and aperitif with captain. All five appeared in the inquiry review. WhatsApp and email hrefs both contained Gin & Wine and the chosen destination. No contact POST or external message was sent.
- Mobile at 390 × 844: document width 380, form width 326.8, choice width 284.8, one column and visual scale 1. No horizontal overflow. Desktop document width 1430 / viewport 1440.
- Current rendered page: one H1, 19 checkboxes (15 experiences + 3 logistics + privacy), five boat radio choices (four formulas + undecided), and Gin & Wine among the 15 JSON-LD items.
- `npm run type-check`: passed, exit 0. Prettier check: all four edited source files passed. `git diff --check`: passed.
- Test contact fields and selections cleared; prior destination/party/date values preserved. Temporary viewport restored and Experience preview tab retained.
- Screenshots: `request-redesign-2026-11-12.png`, `gin-wine-package-2026-11-12.png`, `gin-wine-mobile-2026-11-12.png`. No commit, push or deployment.

## Current revision — 2026-11-11

- Existing VIP palette restored throughout: black, gold `#D4AF37` and ivory `#F7F2EA`; Cormorant/Inter. Formal Italian reviewed in the Experience content.
- 15 interests, one unified Como Silk Experience, four boat proposals and six itineraries split between the lakes. Como initially shows six proposals; Maggiore shows five, including the islands, Santa Caterina and Vergante golf. Destination filtering verified in the browser.
- Airport or railway-station pickup and competent accompaniment described without inventing certifications or partner agreements.
- Google Maps fields tested with public arrival/hotel/villa names. Correct route encoding and complete inquiry review observed; editing the hotel clears the previous review. No external contact submission performed.
- Maps URL checks passed for route order, special characters, point count and maximum URL length.
- Rendered SEO checks: one H1; public-domain canonical and OG; intentional noindex; 15 schema items matching 15 cards; no duplicate IDs, broken internal anchors or unloaded content images. Evidence in `seo-rendered-2026-11-11.json`.
- Desktop document width 1430 / viewport 1440. Mobile document width 380 / viewport 390; map inputs 284.8 pixels, stop input 228.8 pixels, no horizontal overflow. Browser visual zoom was reset before the final mobile captures; final mobile scale 1. See `google-maps-2026-11-11.png`, `google-maps-mobile-2026-11-11.png` and `vip-mobile-2026-11-11.png`.
- Final `npm run type-check`: passed, exit 0. `git diff --check`: passed. Synthetic form data cleared; temporary viewport restored and preview tab retained. No commit, push or deployment.
- Previous sections below are historical checks of earlier drafts. Current scope and launch limits are in `../README.md` and `../SEO-AUDIT.md`.

## Expanded services follow-up

- Added guided weaving-mill visits, guided dyehouse visits, textile-showroom shopping and related FAQ.
- Expanded gourmet dining into restaurant itineraries; added tastings/cooking, nature/e-bike, wellness and car-rental itineraries. Updated boat copy to include rental and skipper options, subject to confirmation.
- Browser confirmed twelve service headings and twelve matching interest checkboxes.
- Synthetic preview request selected weaving, dyeing, showroom shopping, gourmet routes and tastings/cooking; all five selections appeared in the review. No contact submitted.
- TypeScript and diff whitespace checks passed after changes.
- Primary-source opportunity research saved in `../opportunita-esperienze.md`; jet-ski rental explicitly held for area/operator checks.
- Updated design capture: `experiences-expanded.png`.

## Initial page checks

- `npm run type-check`: passed, exit 0.
- `git diff --check`: passed.
- Next development server: `/experience` HTTP 200, compiled successfully from this checkout on localhost:3010.
- Browser at 1440 × 1000: all three content images loaded; document scroll width 1430, viewport width 1440 (no horizontal overflow).
- Browser at 390 × 844: document scroll width 380, viewport width 390 (no horizontal overflow); form width 326.8 pixels.
- Lake Maggiore destination button populated the correct destination.
- Form test with synthetic `Ospite Demo`, `demo@example.com`, 2 guests, transfers + boat interests and notes: review displayed the complete brief and explicit no-send preview notice.
- Expanded the existing-hotel FAQ and observed its answer.
- Privacy URL verified against the repository and corrected to `/privacy-policy`.
- No POST to `/api/contatti`, booking, payment, commit, push or deployment was performed.
- Existing global chrome performs its usual analytics/recent-sales/token requests in development; the no-send statement applies to the Experience request form.
- Real contact delivery, production launch, remaining locale translations and commercial terms are outside this draft verification and are explicitly pending.

Browser test tooling note: after changing the viewport, some Playwright FAQ/floating-control selectors did not resolve although the AX tree showed them. FAQ expansion was verified through AX; a reload restored the clean preview. Mobile screenshot capture in IAB contains unused canvas space; the DOM measurements above are the responsive overflow evidence. Desktop screenshot is suitable for reviewing the design.

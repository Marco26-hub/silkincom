# SILKinCOM VIP Experience

Updated 2026-11-12. Tailor-made inquiry page for Lake Como and Lake Maggiore, integrated in the existing Next.js storefront.

- Seven complete languages: it/en/es/fr/de/pt/nl, localized metadata, canonical URLs, hreflang and sitemap. Missing translations throw a logged error; no silent fallback.
- Gold VIP Experience button in the shared header; persistent Create your Experience link to the form.
- Two real destination photographs in a pausable hero slideshow, with reduced-motion support.
- Nineteen activity proposals, filtered by lake and category. Compact photo cards have a short description, expandable practical details and package selection.
- New activities: Gin & Wine, Go Kart, Jungle Park Jet Ski and Visit Milano. Operator, availability and requirements must be confirmed; no partnership or guaranteed inventory is claimed.
- Como-only destinations: villas, Brunate, Como Silk and Como golf. Maggiore-only destinations: Borromean Islands, Santa Caterina and Vergante golf. Village photographs switch between Varenna and Stresa.
- Four boat proposals, six sample itineraries, guided activities, generic airport/station pickup, optional accommodation and car rental.
- Package form with checkboxes, review, existing contact API, optional keyless Google Maps links; direct WhatsApp/email drafts are also available. No real request has been sent during verification.
- No prices, checkout, guaranteed access or paid booking. Commercial terms and operators remain to be defined by the owner.

## Photography

Destination/landmark photos are real, with visible Wikimedia author/license credits. `public/experience/cards/credits.json` records additional sources and transformations. Generic activity photos are AI-generated illustrative editorial images; they do not identify a contracted venue. Jet Ski uses the real user-supplied IMG_6390 photograph in both destination views, replacing generated versions. The kart image was replaced to remove the lake from its background. Images are local WebP, lazy loaded and sized responsively.

Historical audits in this directory describe earlier drafts; see the final audit for the current release checks.

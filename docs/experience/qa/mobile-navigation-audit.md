# Experience navigation verification — 2026-11-12

- At 320 and 390 CSS px, section links are replaced by a native “Explore” disclosure. No horizontal scrolling is required to reach a section.
- The itinerary creation link remains visible beside the disclosure; both controls have a minimum 44 px touch target.
- Opening exposes five vertical links; selecting an anchor closes the disclosure and navigates to the selected section.
- Escape closes the disclosure and returns focus to its summary.
- At 1440 px, the five desktop section links remain visible and the mobile disclosure is hidden.
- Header VIP Experience link uses gold typography beside Menu, without the previous filled tile. Header controls fit at 320 and 390 px.
- CUA visual verification completed in the in-app browser. Screenshot: `menu-vip-mobile-final.png`.
- TypeScript and production build passed. Production HTTP audit: seven locales, 505 source strings, 19 schema activities, branded Open Graph title, canonical and hreflang checks passed.
- Generated sitemap contains seven Experience URL entries, each with eight language alternates (including x-default).
- The temporary Next.js verification server initially looped on locale redirects when explicitly bound to 127.0.0.1. Restarting with the normal Next.js host binding resolved the local-only verification issue; no routing code was changed.
- No real inquiries, emails, WhatsApp messages or bookings were submitted.

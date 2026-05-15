# FASE 4 — Frontend Pubblico

## Stack frontend

- **Next.js 14** (App Router)
- **React 18** + TypeScript
- **Tailwind CSS** + shadcn/ui
- **Framer Motion** (microanimazioni)
- **Stripe Elements** (Payment Element)
- **Zustand** (cart state, persisted localStorage)
- **TanStack Query** (data fetching client-side)
- **react-hook-form + Zod** (form validation)
- **Lucide Icons**

## Struttura `/src/app/`

```
src/app/
├── layout.tsx                    # Root layout + fonts + Providers
├── page.tsx                      # Homepage redirect
├── (site)/
│   ├── page.tsx                  # Homepage
│   ├── shop/page.tsx             # Shop con filtri
│   ├── product/[slug]/page.tsx   # Pagina prodotto SSG
│   ├── collections/[slug]/page.tsx
│   ├── materials/[slug]/page.tsx
│   ├── la-nostra-storia/page.tsx
│   ├── trame-di-como/page.tsx    # Magazine
│   ├── contact/page.tsx
│   ├── faq/page.tsx
│   ├── shipping-returns/page.tsx
│   ├── privacy-policy/page.tsx   # PLACEHOLDER
│   ├── cookie-policy/page.tsx    # PLACEHOLDER
│   ├── terms/page.tsx            # PLACEHOLDER
│   ├── cart/page.tsx
│   ├── checkout/page.tsx
│   ├── thank-you/page.tsx
│   └── account/
│       ├── page.tsx
│       ├── orders/page.tsx
│       ├── orders/[id]/page.tsx
│       ├── addresses/page.tsx
│       └── wishlist/page.tsx
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── forgot-password/page.tsx
├── (admin)/
│   └── admin/...                 # Vedi FASE 5
└── api/
    ├── stripe/webhook/route.ts
    ├── orders/route.ts
    ├── newsletter/subscribe/route.ts
    └── auth/logout/route.ts
```

## Componenti chiave

### Site Components
- `Header` (sticky, mega menu, cart count, mobile drawer)
- `Footer` (newsletter, links, social, P.IVA placeholder)
- `CookieBanner` (GDPR consent BEFORE script loading)
- `Logo`, `Breadcrumb`

### Home Components
- `Hero` (fullscreen image + Framer Motion fade-in)
- `FeaturedCollections` (3 card SSR)
- `BestSellers` (Suspense + skeleton)
- `StorySection` (image + text storytelling)
- `MaterialsSection` (5 cards material)
- `MagazinePreview` (3 article preview)

### Shop Components
- `ShopFilters` (collection, material, color, price; URL searchParams)
- `ShopHeader` (sort, count)
- `ProductGrid` (Suspense, paginated)
- `ProductCard` (image, hover add to cart, wishlist)
- `Pagination` (URL-based)

### Product Components
- `ProductGallery` (zoom, thumbnails)
- `ProductInfo` (color picker, quantity, add to cart)
- `ProductTabs` (Descrizione | Composizione | Cura)
- `RelatedProducts`
- `ProductSchema` (schema.org JSON-LD)

### Cart Components
- `useCart()` — Zustand store con persist localStorage
- `CartPage` — items, coupon, shipping estimate, totals
- `CartDrawer` — slide-in mobile

### Checkout Components
- `CheckoutSteps` (1/3 Dati, 2/3 Indirizzo, 3/3 Pagamento)
- `CheckoutForm` (Stripe PaymentElement)
- `CheckoutSummary` (sidebar persistent)

### Account Components
- `AccountLayout` (sidebar nav)
- `OrdersTable`
- `OrderDetailView` (timeline + tracking)
- `AddressManager`
- `WishlistGrid`

## Design system applicato

### Tailwind config
```typescript
colors: {
  ivory: '#F7F2EA',
  'beige-light': '#EDE3D3',
  'beige-medium': '#C9B79C',
  'gold-primary': '#D4AF37',
  'gold-dark': '#B8941C',
  'pearl-grey': '#D8D5CF',
  'soft-grey': '#A9A6A0',
  'soft-black': '#171717',
  'warm-white': '#FFFDF8',
}
```

### Fonts
- `next/font/google` per Cormorant Garamond, Inter, Libre Baskerville
- CSS variables: `--font-cormorant`, `--font-inter`, `--font-baskerville`

## SEO & Performance

### Metadata
- Dynamic `generateMetadata()` per prodotti, collezioni, blog
- OpenGraph + Twitter Card
- schema.org Product, Article, BreadcrumbList, Organization

### Performance
- ISR su shop (revalidate 300s)
- SSG per product pages via `generateStaticParams()`
- Next/Image con WebP/AVIF auto + lazy loading
- Hero: priority, quality 85
- CDN Vercel Edge

## GDPR

### Cookie banner
- Consent-first (NO scripts before consent)
- 3 categorie: necessari (sempre), analytics (GA4), marketing (Meta Pixel)
- localStorage `cookie-consent` + `cookie-consent-date`
- Personalizzabile + "Solo necessari" + "Accetta tutti"

### Form
- Newsletter checkbox GDPR esplicito
- Checkout checkbox privacy + terms
- Account: data export request, deletion request (placeholder)

## AVVOCATO DEL DIAVOLO — FASE 4

### Rischi critici
1. Cart state perso refresh → ✓ Zustand persist
2. Hydration mismatch cart count → render after mount
3. Stripe Element non carica → loading + retry fallback
4. Webhook arriva prima redirect → polling thank-you OR Supabase realtime
5. Cookie banner blocca scripts ma li carica comunque → ✓ load AFTER consent
6. Form senza validation client → react-hook-form + zod
7. Wishlist solo localStorage → sync con DB se logged
8. Filtri shop full reload → ✓ Suspense + searchParams
9. Image priority all → solo hero principale
10. Coupon validation client trustato → ✓ server action

### Cose nota cliente premium
- Hover states mancanti
- Animazioni sloppy
- Loading spinner generico vs custom skeleton
- Toast notifications generic
- Form validation message colors stridenti
- Cart drawer animation jerky
- Image gallery zoom non smooth
- Mobile menu transition <300ms

### Priorità
1. CRITICO: Stripe checkout flow + webhook robustness
2. CRITICO: Cookie consent BEFORE script loading
3. CRITICO: Server-side coupon/price validation
4. ALTO: Cart persistence + hydration fix
5. ALTO: Form validation completa
6. ALTO: Loading + empty + error states
7. MEDIO: Image optimization
8. MEDIO: Accessibility (aria-labels, contrast)

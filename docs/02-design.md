# FASE 2 — Design System e UX

## 1. Palette colori finale

```css
/* Neutrals */
--color-white-warm: #FFFDF8;
--color-ivory: #F7F2EA;
--color-beige-light: #EDE3D3;
--color-beige-medium: #C9B79C;
--color-grey-pearl: #D8D5CF;
--color-grey-soft: #A9A6A0;
--color-black-soft: #171717;

/* Accent */
--color-gold-primary: #D4AF37;
--color-gold-dark: #B8941C;

/* Semantic */
--color-success: #4CAF50;
--color-warning: #FF9800;
--color-error: #F44336;
--color-info: #2196F3;
```

## 2. Typography

### Combinazione scelta
- **Display**: Cormorant Garamond (h1-h3, weight 300-500)
- **Body**: Inter (UI, paragraphs)
- **Accent**: Libre Baskerville (quote, italic)

### Scale
- h1: 56-72px, light, letter-spacing +2px
- h2: 42px, light
- h3: 32px, medium
- Body: 16px, regular, line-height 1.6
- Label: 12px uppercase, semibold, tracking-wider

## 3. Componenti UI riusabili

### Buttons
- **Primary**: bg-gold + soft-black text + uppercase
- **Secondary**: border + transparent bg + hover invert
- **Tertiary**: text link + gold underline

### Form inputs
- Border 1px pearl-grey
- Focus: border gold-primary
- Padding: 12px 16px

### Cards
- Bg warm-white
- Border 1px pearl-grey
- No border radius (sharp boutique edges)
- Hover: shadow subtle + image scale 105%

### Status badges
- Pill 12px text
- Color coded by status

## 4. Wireframes

### Homepage
- Hero fullscreen typography + CTA primary/secondary
- Featured Collections (3 card grid)
- Best Sellers (4 product grid)
- Story Section (image left + text right)
- Materials grid (5 colonne)
- Magazine preview
- Newsletter signup
- Footer

### Shop
- Sidebar filters (collection, material, color, price)
- Top sort bar
- Grid 2/3 colonne responsive
- Pagination

### Product Page
- Gallery left (zoom + thumbnails)
- Info right (price, color, size, stock, CTA)
- Tabs: Descrizione | Composizione | Cura
- Related products

### Checkout
- 3 steps: Dati / Indirizzo / Pagamento
- Sidebar riepilogo persistente
- Stripe Payment Element

### Account
- Sidebar nav: Profilo, Ordini, Indirizzi, Wishlist, Preferenze
- Order detail con timeline + tracking

### Admin Dashboard
- Sidebar nav
- KPI cards top
- Charts + recent orders
- Quick actions

## 5. Copy homepage

### Hero
```
SILKINCOM

L'eleganza di Como,
in ogni dettaglio.

Accessori in seta, cashmere e fibre naturali.
100% Made in Como.

[Scopri la collezione]  [La nostra storia]
```

### Storytelling
```
DAL CUORE DI COMO
Una storia di seta e innovazione.

Tre generazioni di maestri artigiani hanno trasformato Como
in icona mondiale della seta. Oggi, questa eredità continua
con SILKinCOM: accessori che uniscono tradizione tessile
comasca e visione contemporanea.
```

### Materiali
```
I NOSTRI MATERIALI
Selezioniamo solo fibre naturali d'eccellenza.

[SETA] [CASHMERE] [LANA] [LINO] [COTONE]
```

### Newsletter
```
RIMANI AGGIORNATO
Scopri le nuove collezioni in anteprima.

✓ Sconto esclusivo 15% per iscritti
✓ Accesso early alle collezioni
```

## AVVOCATO DEL DIAVOLO — FASE 2

### Rischi critici
1. Cormorant troppo formal → use weight 300-400, size 32+
2. Oro #D4AF37 su bianco may fail WCAG AA contrast → test reale
3. Whitespace generoso → desktop overkill (max 200px padding)
4. Card senza interattività → no engagement (hover gold border)
5. Button styles >3 → caotico
6. Form input border 1px pearl → hard find (min 2px)
7. Mobile responsiveness neglected
8. Hero image 2MB → 60% bounce mobile
9. Newsletter CTA non distinguibile
10. Cart drawer animation jerky

### Cose nota cliente premium
- Font rendering blurry → use Google Fonts CDN
- Hover state missing → feels dead
- Image grain → "stock photo" feel
- Pixel alignment off → noticed immediately
- Whitespace random → not intentional
- Color shift across sections → amateurish

### Priorità
1. CRITICO: Visual test font su devices reali
2. CRITICO: WCAG AA contrast validation
3. ALTO: Mobile responsiveness (touch targets)
4. ALTO: Component consistency
5. MEDIO: Micro-interactions (Framer Motion)
6. MEDIO: Image optimization (WebP/AVIF)

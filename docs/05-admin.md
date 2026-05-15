# FASE 5 — Admin Dashboard

## Struttura `/src/app/(admin)/`

```
src/app/(admin)/
├── layout.tsx                    # Auth guard + sidebar + topbar
└── admin/
    ├── page.tsx                  # Dashboard overview
    ├── products/
    │   ├── page.tsx
    │   ├── new/page.tsx
    │   ├── [id]/edit/page.tsx
    │   └── actions.ts            # Server actions
    ├── orders/
    │   ├── page.tsx
    │   ├── [id]/page.tsx
    │   └── actions.ts
    ├── customers/page.tsx
    ├── collections/page.tsx
    ├── categories/page.tsx
    ├── materials/page.tsx
    ├── colors/page.tsx
    ├── coupons/
    │   ├── page.tsx
    │   ├── new/page.tsx
    │   └── actions.ts
    ├── shipments/page.tsx
    ├── blog/
    │   ├── page.tsx
    │   ├── new/page.tsx
    │   └── [id]/edit/page.tsx
    ├── media/page.tsx
    ├── newsletter/page.tsx
    ├── settings/page.tsx
    └── audit-log/page.tsx
```

## Auth & Roles

### Layout guard
```typescript
const allowedRoles = ['admin', 'super_admin', 'editor', 'order_manager'];
if (!profile || !allowedRoles.includes(profile.role)) redirect('/');
```

### Server actions guard
```typescript
async function requireAdminRole() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin', 'editor'].includes(profile.role)) {
    throw new Error('Forbidden');
  }
  return { user, profile };
}
```

### Permission matrix

| Sezione | super_admin | admin | editor | order_manager |
|---------|:-:|:-:|:-:|:-:|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Prodotti CRUD | ✓ | ✓ | ✓ | – |
| Ordini view | ✓ | ✓ | – | ✓ |
| Ordini update | ✓ | ✓ | – | ✓ |
| Customers | ✓ | ✓ | – | – |
| Collezioni/Categorie/Materiali/Colori | ✓ | ✓ | – | – |
| Coupon | ✓ | ✓ | – | – |
| Blog | ✓ | ✓ | ✓ | – |
| Media | ✓ | ✓ | ✓ | – |
| Newsletter | ✓ | ✓ | – | – |
| Settings | ✓ | – | – | – |
| Audit Log | ✓ | – | – | – |
| Delete prodotti | ✓ | ✓ | – | – |

## Dashboard Overview

### KPIs (30gg)
- Fatturato (€)
- Ordini totali
- AOV (Average Order Value)
- Nuovi clienti

### Charts
- Andamento vendite (line chart 30gg) — Recharts
- Top prodotti

### Quick Actions
- Ordini da spedire (con count)
- Stock basso (count + lista)
- Carrelli abbandonati
- Ultimi ordini (10 records)

## CRUD Prodotti

### Funzionalità
- Lista paginata (20/page) con search + filter status
- Form creazione/modifica con react-hook-form + zod
- Auto-slug generation da nome
- Image uploader multi-file (max 5MB, MIME validation)
- Set primary image
- Variants management (color × material)
- Stock initial setup
- SEO title/description fields
- Pubblicazione: draft/published/archived
- Flags: featured, bestseller, limited_edition

### Server actions
- `createProduct(input)` — validation Zod + INSERT + relations + inventory + audit log
- `updateProduct(id, input)` — UPDATE + replace relations + revalidatePath
- `duplicateProduct(id)` — clone con nuovo slug/SKU + status=draft
- `archiveProduct(id)` — status=archived
- `deleteProduct(id)` — soft delete se ha ordini, else hard delete

## Gestione Ordini

### Lista
- Filter status (pending, paid, processing, shipped, delivered, cancelled, refunded)
- Search per order_number / customer_email
- Sort created_at DESC

### Detail
- Order items con product link
- Pricing breakdown (subtotal, shipping, tax, discount, total)
- Customer info + indirizzo spedizione
- Payment info (Stripe PI ID)
- Status update dropdown (con state machine)
- Tracking number + carrier → notify customer email
- Refund button (Stripe refund + DB update + inventory restore)

### Server actions
- `updateOrderStatus(id, status)` — set timestamps (shipped_at, delivered_at)
- `addTrackingNumber(id, tracking, carrier)` — INSERT shipment + email customer
- `refundOrder(id)` — Stripe refund + status=refunded + restore inventory

## CRUD Coupon

Form fields:
- Code (UPPERCASE, validated)
- Discount type: percentage | fixed_amount | free_shipping
- Discount value
- Valid from / Valid until
- Max uses (total)
- Max uses per customer
- Minimum order amount
- Active toggle

## Newsletter

- Lista iscritti (filter is_subscribed=TRUE)
- Export CSV (filtra per consent_gdpr=TRUE)
- Confirmed status visible
- Source tracking

## Media Library

- Grid view 100 items
- Upload multi-file
- Alt text edit
- Use tracking (in quale prodotto/blog)
- Delete con check riferimenti

## Settings

Sezioni:
- Dati aziendali (P.IVA, ragione sociale, sede)
- Contatti (email, telefono)
- E-commerce (free shipping threshold)
- Tracking & Analytics (GA4 ID, GTM ID, Meta Pixel ID)

Storage: `site_settings` JSONB key-value.

## Audit Log

- Tutte le azioni admin tracciate
- Fields: admin_id, action, entity_type, entity_id, changes (JSONB), ip_address, user_agent, created_at
- Visibile solo super_admin
- Helper: `logAdminAction(adminId, action, entityType, entityId, changes)`

## AVVOCATO DEL DIAVOLO — FASE 5

### Rischi critici
1. Server Action senza auth check → customer modifica prodotti
2. Service role key esposto al client → breach totale
3. Soft delete non implementato → order orfani
4. Image upload senza MIME server-side → XSS
5. Audit log best-effort → no traccia se fallisce
6. Refund senza check status → Stripe error
7. Stock restore senza lock → race condition
8. Bulk operations assenti → admin frustrato
9. Order status transition libera → stato inconsistente
10. Settings GTM/GA4 caricati anche se vuoti → console error
11. Newsletter export senza filter consenso → multa GDPR
12. Media library senza paginazione → crash browser

### Errori probabili
- Form senza dirty-check → user perde modifiche
- No optimistic updates
- Toast missing
- Tabelle senza sorting
- Status badge colors inconsistenti
- ImageUploader no preview
- Coupon date validation: valid_until < valid_from accettato
- No undo destructive actions
- Search senza debounce
- Pagination resetta filters

### Breaking points
- Server Action timeout (Vercel 30s) su bulk
- Trigger inventory fail su refund → discrepancy
- Audit log explosion → admin slow
- Settings cache → ISR delay
- RLS conflict editor su delete → silent fail
- Storage piena → upload silent fail
- Webhook retry su processed action → idempotency necessaria

### Priorità
1. CRITICO: Auth check ogni server action
2. CRITICO: Service role SOLO server-side
3. CRITICO: MIME validation server-side upload
4. CRITICO: Soft delete + order integrity
5. CRITICO: Audit log su write operations
6. ALTO: Refund flow (Stripe + DB + inventory)
7. ALTO: Order status state machine
8. ALTO: Bulk operations
9. MEDIO: Optimistic UI + toast
10. MEDIO: Search debounce

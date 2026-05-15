# FASE 3 — Database e Backend

## File schema

Tutti gli script SQL sono in `/database/`:

- `schema.sql` — 30+ tabelle (profiles, customers, products, orders, ecc.)
- `rls-policies.sql` — Row Level Security policies
- `indexes.sql` — Indici per performance
- `triggers.sql` — Triggers + funzioni (LTV, inventory, order number)
- `seed.sql` — Dati demo realistic

## Tabelle principali

### Auth & Users
- `profiles` — base auth + ruolo (customer, admin, editor, order_manager, super_admin)
- `admin_users` — ruoli admin estesi
- `customers` — customer_id = profile_id, LTV, consensi marketing
- `customer_addresses` — shipping/billing

### Catalog
- `products` — prodotto base
- `product_variants` — varianti (color + material combinations)
- `product_images` — gallery con primary flag
- `categories`, `collections`, `materials`, `colors`
- Junction: `product_collections`, `product_materials`, `product_colors`, `product_categories`

### Inventory
- `inventory` — quantity_total, quantity_available, quantity_reserved
- Functions: `decrement_inventory()`, `increment_inventory()` con FOR UPDATE lock

### Cart & Orders
- `carts` (active/abandoned/converted)
- `cart_items`
- `orders` con full lifecycle (pending → paid → processing → shipped → delivered)
- `order_items` con price snapshot per integrità storica
- `payments` con stripe_payment_intent_id UNIQUE per idempotency
- `shipments` con tracking + carrier

### Marketing
- `coupons` (percentage / fixed_amount / free_shipping)
- `coupon_redemptions` con max_uses + max_uses_per_customer
- `wishlist`
- `reviews` con verified_purchase + approval workflow
- `newsletter_subscribers` con consent_gdpr + double opt-in

### Content
- `blog_posts` + `blog_categories`
- `pages` (statiche)
- `media_library`

### System
- `site_settings` — JSONB key-value
- `audit_logs` — tutte azioni admin con IP, user agent, changes

## Backend / API

### File structure
```
src/
├── app/
│   ├── api/
│   │   ├── stripe/webhook/route.ts
│   │   ├── orders/route.ts
│   │   ├── cart/route.ts
│   │   └── newsletter/subscribe/route.ts
│   └── (admin)/admin/[entity]/actions.ts
├── lib/
│   ├── supabase/{client,server}.ts
│   ├── stripe.ts
│   ├── email.ts
│   ├── audit.ts
│   ├── auth.ts
│   ├── storage.ts
│   └── validations.ts
```

### Stripe webhook (sicuro)

Verifica firma SEMPRE:
```typescript
event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
```

Idempotency: check `order.status !== 'pending'` prima di processare.

### Order creation (server-side)

Pattern:
1. Validate input con Zod
2. Fetch product prices da DB (mai trustare client)
3. Validate coupon server-side (date, max_uses, customer eligibility)
4. Calculate shipping da `shipment_zones`
5. INSERT order pending
6. INSERT order_items con price_per_unit snapshot
7. Create Stripe Payment Intent con metadata.order_id
8. Return clientSecret al frontend

### Storage Supabase

Bucket: `product-images`
- File path: `products/{productSku}/{filename}`
- Validation: image MIME + max 5MB
- Public read, admin-only write

### Email (Resend)

- Order confirmation
- Shipping notification con tracking
- Newsletter confirmation (double opt-in)
- Password reset
- Refund confirmation

## Auth & Roles

```typescript
type UserRole = 'customer' | 'admin' | 'editor' | 'order_manager' | 'super_admin';
```

Ruoli definiti in `profiles.role`. Server actions verificano ruolo via `requireAdminRole()`.

Service role key (`SUPABASE_SERVICE_ROLE_KEY`) **SOLO server-side**.

## AVVOCATO DEL DIAVOLO — FASE 3

### Rischi critici
1. **RLS troppo permissive** → customer vede ordini altri
2. **Stripe webhook signature non verificata** → fake webhook crea ordini
3. **Idempotency assente** → retry crea ordini duplicati
4. **Coupon validation client-side** → dispute totale
5. **Inventory senza lock** → race condition stock negativo
6. **Product price trustato dal client** → attacker paga €1
7. **Customer update order status** → marcia "delivered" subito
8. **Inventory decrement before payment** → stock 0 ma cliente non ha pagato
9. **Email blocking** → checkout timeout
10. **Trigger silent fail** → order creato senza decremento stock

### Errori probabili
- FK ON DELETE SET NULL → orphan orders
- No soft delete products
- Inventory non isolato per variant
- Order item price_per_unit NULL → no historical pricing
- Coupon redemptions duplicate
- Shipping zone NULL → total NULL → Stripe error
- Audit log no timezone

### Priorità
1. CRITICO: RLS isolation customer
2. CRITICO: Stripe webhook signature + idempotency
3. CRITICO: Server-side price calculation
4. CRITICO: Inventory FOR UPDATE lock
5. ALTO: Coupon validation server
6. ALTO: Audit log su tutte write
7. MEDIO: Soft delete products

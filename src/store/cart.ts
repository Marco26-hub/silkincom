import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = {
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  // Size variant — present only for apparel items. The pair (slug, variantId)
  // uniquely identifies a line item; the same product in two sizes lives as
  // two separate rows in the cart.
  variantId?: string;
  size?: string;
  // Variant stock captured on the product page; checkout verifies it again.
  maxQuantity?: number;
};

function keyOf(slug: string, variantId?: string): string {
  return variantId ? `${slug}::${variantId}` : slug;
}

function sameLine(a: CartItem, slug: string, variantId?: string): boolean {
  return a.slug === slug && (a.variantId ?? '') === (variantId ?? '');
}

export type AppliedCoupon = {
  code: string;
  discount_amount: number;
  discount_type: string;
  discount_value: number;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  coupon: AppliedCoupon | null;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (slug: string, variantId?: string) => void;
  updateQty: (slug: string, qty: number, variantId?: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  applyCoupon: (c: AppliedCoupon) => void;
  removeCoupon: () => void;
  total: () => number;
  totalAfterDiscount: () => number;
  count: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      coupon: null,

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, item.slug, item.variantId));
          const limit = item.maxQuantity ?? existing?.maxQuantity;
          if (limit !== undefined && (existing?.quantity ?? 0) >= limit) {
            console.info(`[cart] Add refused for ${item.slug}: variant stock limit ${limit}.`);
            return state;
          }
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, item.slug, item.variantId) ? { ...i, maxQuantity: limit, quantity: i.quantity + 1 } : i
              ),
              isOpen: true,
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }], isOpen: true };
        }),

      removeItem: (slug, variantId) =>
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, slug, variantId)),
        })),

      updateQty: (slug, qty, variantId) =>
        set((state) => {
          const line = state.items.find(i => sameLine(i, slug, variantId));
          if (line?.maxQuantity !== undefined && qty > line.maxQuantity) {
            console.info(`[cart] Quantity update refused for ${slug}: variant stock limit ${line.maxQuantity}.`);
            return state;
          }
          return {
          items:
            qty <= 0
              ? state.items.filter((i) => !sameLine(i, slug, variantId))
              : state.items.map((i) =>
                  sameLine(i, slug, variantId) ? { ...i, quantity: qty } : i
                ),
          };
        }),

      clearCart: () => set({ items: [], coupon: null }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      applyCoupon: (coupon) => set({ coupon }),
      removeCoupon: () => set({ coupon: null }),

      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      totalAfterDiscount: () => {
        const sub = get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const disc = get().coupon?.discount_amount ?? 0;
        return Math.max(sub - disc, 0);
      },
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'silkincom-cart', skipHydration: true }
  )
);

export { keyOf as cartLineKey };

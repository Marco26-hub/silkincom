// Database type definitions (manual + da generare con `supabase gen types typescript`)

export type UserRole = 'customer' | 'admin' | 'editor' | 'order_manager' | 'super_admin';

export type ProductStatus = 'draft' | 'published' | 'archived';
export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'failed';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
export type ShipmentStatus = 'pending' | 'picked' | 'shipped' | 'in_transit' | 'delivered' | 'failed';
export type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping';
export type CartStatus = 'active' | 'abandoned' | 'converted';
export type AddressType = 'shipping' | 'billing' | 'both';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  preferred_language: string;
  newsletter_consent: boolean;
  newsletter_consent_at: string | null;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  lifetime_value: number;
  total_orders: number;
  last_order_at: string | null;
  notes: string | null;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  type: AddressType;
  full_name: string;
  phone: string;
  street_address: string;
  city: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export interface Material {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  origin: string | null;
  characteristics: string | null;
  benefits: string | null;
  image_url: string | null;
  display_order: number;
}

export interface Color {
  id: string;
  name: string;
  hex_code: string;
  image_url: string | null;
  display_order: number;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description_short: string | null;
  description_long: string | null;
  technical_description: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  status: ProductStatus;
  is_featured: boolean;
  is_bestseller: boolean;
  is_limited_edition: boolean;
  composition: string | null;
  dimensions: string | null;
  care_instructions: string | null;
  origin: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  color_id: string | null;
  material_id: string | null;
  variant_sku: string;
  variant_name: string | null;
  price_override: number | null;
}

export interface Inventory {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity_total: number;
  quantity_available: number;
  quantity_reserved: number;
  warehouse_location: string | null;
  last_restocked_at: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_email: string;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  is_test: boolean;
  shipping_method: string | null;
  delivery_method: 'standard' | 'hand_delivery';
  shipping_address_id: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
  payment_status: PaymentStatus;
  paid_at: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  variant_id: string | null;
  quantity: number;
  price_per_unit: number;
  total_price: number;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  currency: string;
  valid_from: string;
  valid_until: string;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  minimum_order_amount: number | null;
  is_active: boolean;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  priceAtAdd: number;
  name?: string;
  imageUrl?: string;
  slug?: string;
}

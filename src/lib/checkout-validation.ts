import { z } from 'zod';

// Shared by the form and the API: whitespace is not a shipping detail.
export const shippingAddressSchema = z.object({
  full_name: z.string().trim().min(1).max(200),
  street_address: z.string().trim().min(1).max(500),
  city: z.string().trim().min(1).max(100),
  postal_code: z.string().trim().min(1).max(20),
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  phone: z.string().trim().min(1).max(30),
});

export const checkoutContactSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  customer_email: z.string().trim().email().max(254),
});

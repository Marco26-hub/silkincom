export type EtsyListing = {
  listing_id: number;
  title: string;
  description: string;
  price: { amount: number; divisor: number; currency_code: string };
  quantity: number;
  state: 'active' | 'inactive' | 'draft' | 'expired' | 'sold_out';
  tags: string[];
  materials: string[];
  sku: string[];
  shipping_profile_id: number | null;
  taxonomy_id: number;
  who_made: 'i_did' | 'someone_else' | 'collective';
  when_made: string;
  is_supply: boolean;
  item_weight: number | null;
  item_weight_unit: string | null;
  item_length: number | null;
  item_width: number | null;
  item_height: number | null;
  item_dimensions_unit: string | null;
  url: string;
  images: EtsyListingImage[];
};

export type EtsyListingImage = {
  listing_image_id: number;
  listing_id: number;
  url_fullxfull: string;
  url_570xN: string;
  rank: number;
};

export type EtsyReceipt = {
  receipt_id: number;
  buyer_email: string;
  buyer_user_id: number;
  name: string;
  first_line: string;
  second_line: string | null;
  city: string;
  state: string | null;
  zip: string;
  country_iso: string;
  status: 'open' | 'paid' | 'completed' | 'canceled';
  is_paid: boolean;
  is_shipped: boolean;
  grandtotal: { amount: number; divisor: number; currency_code: string };
  create_timestamp: number;
  update_timestamp: number;
  transactions: EtsyTransaction[];
};

export type EtsyTransaction = {
  transaction_id: number;
  listing_id: number;
  title: string;
  quantity: number;
  price: { amount: number; divisor: number; currency_code: string };
  sku: string | null;
};

export type SyncResult = {
  synced: number;
  errors: string[];
  skipped: number;
};

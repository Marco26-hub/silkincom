/**
 * Packlink PRO API client.
 *
 * Base: https://api.packlink.com/v1
 * Auth: the raw API key in the `Authorization` header (no "Bearer" prefix).
 *
 * Flow: query /services for available carriers + prices, then POST /shipments
 * to create the shipment. The shipment is created as a draft — label + tracking
 * become available once it is paid from the Packlink PRO account balance.
 */

const PACKLINK_BASE = 'https://api.packlink.com/v1';

/** Fixed sender (shop warehouse) — the `from` address on every shipment. */
export const PACKLINK_SENDER = {
  name: 'SILKinCOM',
  surname: 'Spedizioni',
  company: 'silkincom',
  street1: 'Via Giuseppe Verdi 2/B',
  zip_code: '22072',
  city: 'Cermenate',
  state: 'CO',
  country: 'IT',
  phone: '+393477196603',
  email: 'silkincom.business@gmail.com',
};

function packlinkHeaders(): HeadersInit {
  const key = process.env.PACKLINK_API_KEY;
  if (!key) throw new Error('PACKLINK_API_KEY non configurata');
  return { Authorization: key, 'Content-Type': 'application/json' };
}

export type PacklinkPackage = {
  weight: number; // kg
  length: number; // cm
  width: number; // cm
  height: number; // cm
};

export type PacklinkService = {
  id: number;
  name: string;
  carrier_name: string;
  base_price?: string | number;
  delivery_to_parcelshop?: boolean;
  [k: string]: unknown;
};

/** Query available carriers/services + prices for a route + package. */
export async function getPacklinkServices(opts: {
  from: { country: string; zip: string };
  to: { country: string; zip: string };
  pkg: PacklinkPackage;
}): Promise<PacklinkService[]> {
  const q = new URLSearchParams({
    'from[country]': opts.from.country,
    'from[zip]': opts.from.zip,
    'to[country]': opts.to.country,
    'to[zip]': opts.to.zip,
    'packages[0][weight]': String(opts.pkg.weight),
    'packages[0][length]': String(opts.pkg.length),
    'packages[0][width]': String(opts.pkg.width),
    'packages[0][height]': String(opts.pkg.height),
    sortby: 'totalprice',
  });
  const res = await fetch(`${PACKLINK_BASE}/services?${q.toString()}`, {
    headers: packlinkHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Packlink /services ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? (data as PacklinkService[]) : [];
}

/** Create a shipment. Returns the created shipment (includes its `reference`). */
export async function createPacklinkShipment(
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${PACKLINK_BASE}/shipments`, {
    method: 'POST',
    headers: packlinkHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Packlink POST /shipments ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  return res.json();
}

/** Fetch a shipment's current state (status, tracking codes, etc.). */
export async function getPacklinkShipment(reference: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${PACKLINK_BASE}/shipments/${encodeURIComponent(reference)}`, {
    headers: packlinkHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Packlink GET /shipments/${reference} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

/** Fetch label PDF URLs for a (paid) shipment. Empty array if not ready yet. */
export async function getPacklinkLabels(reference: string): Promise<string[]> {
  try {
    const res = await fetch(`${PACKLINK_BASE}/shipments/${encodeURIComponent(reference)}/labels`, {
      headers: packlinkHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Split a full name into { name, surname } for Packlink address fields. */
export function splitName(full: string): { name: string; surname: string } {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: 'Cliente', surname: '-' };
  if (parts.length === 1) return { name: parts[0], surname: parts[0] };
  return { name: parts[0], surname: parts.slice(1).join(' ') };
}

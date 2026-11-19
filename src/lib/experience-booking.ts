import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const guestToken = /^[0-9a-f]{64}$/;
export function hashBookingToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function bookingJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
  } });
}
export function bookingOriginMatches(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && (origin === request.nextUrl.origin || origin === process.env.NEXT_PUBLIC_APP_URL));
}

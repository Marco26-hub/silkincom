import { NextResponse } from 'next/server';
import { mintFormToken } from '@/lib/antibot';

// Mints a short-lived signed timing token for public forms. Called on form/page
// mount; the value is echoed back on submit and verified server-side.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { token: mintFormToken() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

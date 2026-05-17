import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Logout is POST-only on purpose.
 *
 * A GET handler here would be invoked by browser / Next.js <Link> prefetching
 * (links are prefetched when they enter the viewport), silently signing the
 * user out every time a page containing the logout link rendered.
 */
export async function POST() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}

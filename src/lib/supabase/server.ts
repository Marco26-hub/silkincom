import { createServerClient as createSSRClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * SSR Supabase client for Server Components, Route Handlers and Server Actions.
 * Uses the modern getAll/setAll cookie interface — required for correct
 * handling of chunked auth cookies and atomic refresh-token rotation.
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — cookies are read-only here.
            // The session is refreshed by the middleware instead.
          }
        },
      },
    }
  );
}

/**
 * Service Role client — SOLO server-side per operations che bypassano RLS.
 * Mai esporre al client. Mai usare in API public.
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

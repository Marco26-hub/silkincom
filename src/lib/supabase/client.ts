import { createBrowserClient as createBrowserSSRClient } from '@supabase/ssr';

export function createBrowserClient() {
  return createBrowserSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

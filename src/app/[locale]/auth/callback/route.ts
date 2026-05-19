import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieToSet = { name: string; value: string; options: CookieOptions };

const ADMIN_ROLES = ['admin', 'super_admin', 'editor', 'order_manager'];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Only allow relative paths to prevent open redirect attacks
  const rawNext = searchParams.get('next');
  const explicitNext =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Carrier response — rebuilt by setAll() so session cookies are written atomically.
  let response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next();
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Route staff accounts to the admin dashboard. The role is always checked,
  // even when a `next` param is present, so a staff member never lands on the
  // customer area after OAuth login.
  let dest = explicitNext ?? '/account';
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profile && ADMIN_ROLES.includes(profile.role)) {
    dest = explicitNext && explicitNext.startsWith('/admin') ? explicitNext : '/admin';
  }

  // Carry the session cookies onto the final redirect.
  const redirect = NextResponse.redirect(`${origin}${dest}`);
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

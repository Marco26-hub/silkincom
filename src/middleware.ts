import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function middleware(request: NextRequest) {
  // This response is rebuilt by setAll() whenever Supabase rotates the session
  // cookies, so refreshed tokens are always written back atomically.
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refreshes the session and rotates cookies if needed.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Carries the refreshed session cookies onto a redirect response.
  const redirectTo = (path: string, search?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = '';
    if (search) {
      for (const [k, v] of Object.entries(search)) url.searchParams.set(k, v);
    }
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  };

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return redirectTo('/login', { redirect: pathname });
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['admin', 'super_admin', 'editor', 'order_manager'];
    if (!profile || !allowedRoles.includes(profile.role)) {
      return redirectTo('/');
    }
  }

  // Protect account routes
  if (pathname.startsWith('/account')) {
    if (!user) {
      return redirectTo('/login', { redirect: pathname });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/account/:path*',
    '/api/admin/:path*',
  ],
};

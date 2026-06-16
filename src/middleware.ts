import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { isRecessoEnabled } from '@/lib/recesso';

type CookieToSet = { name: string; value: string; options: CookieOptions };

const handleI18nRouting = createIntlMiddleware(routing);

// Strips a leading locale prefix (e.g. `/en/admin` -> `/admin`) so auth
// checks work the same for the default locale and every prefixed locale.
function stripLocale(pathname: string): { locale: string | null; rest: string } {
  const segments = pathname.split('/');
  const maybeLocale = segments[1];
  if (maybeLocale && (routing.locales as readonly string[]).includes(maybeLocale)) {
    const rest = '/' + segments.slice(2).join('/');
    return { locale: maybeLocale, rest: rest === '/' ? '/' : rest.replace(/\/$/, '') || '/' };
  }
  return { locale: null, rest: pathname };
}

export async function middleware(request: NextRequest) {
  // 0. Short branded UTM links for social bios + captions (e.g. silkincom.com/ig).
  //    Resolved here, before next-intl, so the bare "/ig" path isn't swallowed by
  //    locale routing. 302 (temporary) keeps campaign attribution out of caches.
  //    Captions stay clean while every visit is attributed; set each platform's
  //    link-in-bio to the matching path. Pinterest already carries UTM on its links.
  const utmShortlinks: Record<string, string> = {
    '/ig': 'instagram',
    '/tt': 'tiktok',
    '/fb': 'facebook',
    '/pin': 'pinterest',
  };
  const shortlinkSource = utmShortlinks[request.nextUrl.pathname];
  if (shortlinkSource) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    url.searchParams.set('utm_source', shortlinkSource);
    url.searchParams.set('utm_medium', 'social');
    return NextResponse.redirect(url);
  }

  // 1. Run next-intl first: handles locale detection, redirects and rewrites.
  //    This runs on every matched route.
  const response = handleI18nRouting(request);

  const { pathname } = request.nextUrl;
  const { locale, rest } = stripLocale(pathname);

  // 1b. Right-of-withdrawal kill-switch. When an admin disables the feature the
  //     public /recesso page must return a real 404. notFound() inside a
  //     [locale] page renders with a 200 status in this app, so we enforce the
  //     404 here in middleware, where the status code is reliable. The flag is
  //     read (anon key, no-store) only for this exact path — every other request
  //     skips it.
  if (rest === '/recesso') {
    if (!(await isRecessoEnabled())) {
      return new NextResponse('Not Found', { status: 404 });
    }
  }

  // 2. Supabase session/auth work only matters for protected routes. Skipping
  //    it elsewhere keeps every public page independent of Supabase, so a
  //    Supabase outage (or missing env in local dev) cannot break the site.
  const needsAuth =
    rest === '/admin' || rest.startsWith('/admin/') ||
    rest === '/account' || rest.startsWith('/account/');
  if (!needsAuth) return response;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return response;

  const prefix = locale ? `/${locale}` : '';

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refreshes the session and rotates cookies if needed. A network failure
  // here is treated as "no user" so protected routes fail closed (redirect
  // to login) rather than 500-ing.
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

  // Carries the refreshed session cookies onto a redirect response, keeping
  // the active locale prefix so the user stays in their language.
  const redirectTo = (path: string, search?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}${path}`;
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
  if (rest === '/admin' || rest.startsWith('/admin/')) {
    if (!user) {
      return redirectTo('/login', { redirect: pathname });
    }
    let role: string | undefined;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      role = profile?.role;
    } catch {
      role = undefined;
    }
    const allowedRoles = ['admin', 'super_admin', 'editor', 'order_manager'];
    if (!role || !allowedRoles.includes(role)) {
      return redirectTo('/');
    }
  }

  // Protect account routes
  if (rest === '/account' || rest.startsWith('/account/')) {
    if (!user) {
      return redirectTo('/login', { redirect: pathname });
    }
  }

  return response;
}

export const config = {
  // Match all routes except API, Next.js internals and files with an
  // extension, while still covering /admin and /account for auth.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};

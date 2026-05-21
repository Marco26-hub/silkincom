import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';

type CookieToSet = { name: string; value: string; options: CookieOptions };

const ADMIN_ROLES = ['admin', 'super_admin', 'editor', 'order_manager'];

const OTP_TYPES: EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // token_hash/type flow — used when the email template emits {{ .TokenHash }}
  // instead of {{ .ConfirmationURL }}. Unlike `code`, it needs no PKCE
  // verifier cookie, so it works when the email is opened on another device.
  const tokenHash = searchParams.get('token_hash');
  const rawType = searchParams.get('type');
  const otpType = OTP_TYPES.includes(rawType as EmailOtpType)
    ? (rawType as EmailOtpType)
    : null;

  // Supabase may bounce here with an error (expired/used link).
  const errParam = searchParams.get('error_description') || searchParams.get('error');

  // Only allow relative paths to prevent open redirect attacks.
  const rawNext = searchParams.get('next');
  const explicitNext =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null;

  if (errParam) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errParam)}`,
    );
  }
  if (!code && !(tokenHash && otpType)) {
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

  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: otpType! });

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Password-recovery links must land on the reset form, not the account
  // dashboard, so the user can actually set a new password. The session is
  // already in the cookies, so /reset-password sees it via getSession().
  let dest: string;
  if (otpType === 'recovery') {
    dest = '/reset-password';
  } else {
    // Route staff accounts to the admin dashboard. The role is always checked,
    // even when a `next` param is present, so a staff member never lands on the
    // customer area after OAuth login.
    dest = explicitNext ?? '/account';
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profile && ADMIN_ROLES.includes(profile.role)) {
      dest = explicitNext && explicitNext.startsWith('/admin') ? explicitNext : '/admin';
    }
  }

  // Carry the session cookies onto the final redirect.
  const redirect = NextResponse.redirect(`${origin}${dest}`);
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

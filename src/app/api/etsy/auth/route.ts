import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { APP_URL } from '@/lib/app-url';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.ETSY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ETSY_API_KEY non configurato' }, { status: 500 });

  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  const redirectUri = `${APP_URL}/api/etsy/auth/callback`;
  const scopes = 'listings_r listings_w listings_d transactions_r transactions_w shops_r shops_w';

  const url = `https://www.etsy.com/oauth/connect?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&client_id=${apiKey}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

  const response = NextResponse.redirect(url);
  response.cookies.set('etsy_oauth_state', state, { httpOnly: true, maxAge: 600, path: '/' });
  response.cookies.set('etsy_code_verifier', codeVerifier, { httpOnly: true, maxAge: 600, path: '/' });

  return response;
}

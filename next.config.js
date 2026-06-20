const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Vercel's image optimizer is gated behind a per-plan monthly quota
    // (source images transformed). We hit HTTP 402 in production, which
    // returns "Payment Required" for every <Image>, blanking out the entire
    // storefront. Disable Vercel optimization and serve the bytes Supabase
    // Storage already holds — they're pre-optimised by the migration +
    // compression pass (JPG q78, longest side ≤ 1600 px, avg ~137 KB).
    //
    // Trade-off: we lose automatic AVIF/WebP delivery and on-the-fly resizing
    // for different viewports. Acceptable while we plan a permanent fix
    // (either upgrading the Vercel plan, or self-hosting a small Cloudflare
    // Worker image proxy).
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    qualities: [60, 75, 85, 90, 92, 95],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'silkincom.com' },
      { protocol: 'https', hostname: 'static.wixstatic.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: '**.etsystatic.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com https://www.googletagmanager.com https://connect.facebook.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://static.wixstatic.com https://*.supabase.co https://*.etsystatic.com https://images.unsplash.com https://images.pexels.com https://www.google-analytics.com https://www.facebook.com",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://stats.g.doubleclick.net https://connect.facebook.net",
              "frame-src https://js.stripe.com https://hooks.stripe.com https://www.facebook.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      {
        // robots.txt / sitemap.xml are static metadata routes. Next serves them
        // with `max-age=0, must-revalidate`, so every crawler/Lighthouse fetch
        // revalidates at the origin — a cold serverless edge can make that fetch
        // time out ("Lighthouse couldn't download robots.txt"). Cache them hard
        // on the CDN so the fetch is always instant.
        source: '/:file(robots.txt|sitemap.xml)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Canonicalizzazione dominio: il dominio Vercel di default
      // (silkincom.vercel.app) serve gli STESSI contenuti del custom domain →
      // Google lo indicizza come DUPLICATO (canonical da solo non basta).
      // Redirect 308 di ogni path verso www.silkincom.com così sparisce
      // dall'indice. (L'apex silkincom.com → www è già gestito da Vercel.)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'silkincom.vercel.app' }],
        destination: 'https://www.silkincom.com/:path*',
        permanent: true,
      },
      // Wix category URLs → nuovo sito italiano
      { source: '/category/twilly', destination: '/collezioni/twilly-como', permanent: true },
      { source: '/category/bellagio', destination: '/collezioni/bellagio', permanent: true },
      { source: '/category/cernobbio', destination: '/collezioni/cernobbio', permanent: true },
      { source: '/category/tremezzo', destination: '/collezioni/tremezzo', permanent: true },
      { source: '/category/varenna', destination: '/collezioni/varenna', permanent: true },
      { source: '/category/collezione-iconica', destination: '/collezioni/iconica', permanent: true },
      { source: '/category/collezione-primavera', destination: '/collezioni/primavera', permanent: true },
      { source: '/category/collezione-inverno', destination: '/collezioni/inverno', permanent: true },
      // Catch-all categorie Wix residue (all-products, collezione-limited-edition, ecc.) → collezioni
      { source: '/category/:slug', destination: '/collezioni', permanent: true },
      { source: '/:locale(en|de|fr|es|pt|nl)/category/:slug', destination: '/:locale/collezioni', permanent: true },
      // ⚠️ CRITICO — Wix PRODUCT PAGES: Google ha indicizzato /product-page/<slug> (decine, alcune in
      // posizione 1-15) ma ora danno 404. 301/308 al nuovo PDP per recuperare ranking + traffico.
      { source: '/product-page/:slug', destination: '/prodotto/:slug', permanent: true },
      { source: '/:locale(en|de|fr|es|pt|nl)/product-page/:slug', destination: '/:locale/prodotto/:slug', permanent: true },
      // Wix blog posts → trame-di-como
      { source: '/post/:slug', destination: '/trame-di-como/:slug', permanent: true },
      { source: '/:locale(en|de|fr|es|pt|nl)/post/:slug', destination: '/:locale/trame-di-como/:slug', permanent: true },
      // Vecchie pagine Wix indicizzate (ranking buono ma URL legacy)
      { source: '/assistenza-contatti', destination: '/contatti', permanent: true },
      { source: '/:locale(en|de|fr|es|pt|nl)/assistenza-contatti', destination: '/:locale/contatti', permanent: true },
      { source: '/resi-e-rimborsi', destination: '/resi', permanent: true },
      { source: '/:locale(en|de|fr|es|pt|nl)/resi-e-rimborsi', destination: '/:locale/resi', permanent: true },
      { source: '/termini-e-condizioni', destination: '/termini', permanent: true },
      { source: '/:locale(en|de|fr|es|pt|nl)/termini-e-condizioni', destination: '/:locale/termini', permanent: true },
      // Vecchi percorsi inglesi
      { source: '/collections/:slug', destination: '/collezioni/:slug', permanent: true },
      { source: '/products/:slug', destination: '/prodotto/:slug', permanent: true },
      { source: '/about', destination: '/la-nostra-storia', permanent: true },
      { source: '/blog', destination: '/trame-di-como', permanent: true },
      { source: '/blog/:slug', destination: '/trame-di-como/:slug', permanent: true },
      { source: '/journal', destination: '/trame-di-como', permanent: true },
      { source: '/journal/:slug', destination: '/trame-di-como/:slug', permanent: true },
      { source: '/contact', destination: '/contatti', permanent: true },
      { source: '/materials', destination: '/materiali', permanent: true },
    ];
  },
};

module.exports = withNextIntl(nextConfig);

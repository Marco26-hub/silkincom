const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [60, 75, 85, 90, 92, 95],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'silkincom.com' },
      { protocol: 'https', hostname: 'static.wixstatic.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
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
              "img-src 'self' data: blob: https://static.wixstatic.com https://*.supabase.co https://images.unsplash.com https://images.pexels.com https://www.google-analytics.com https://www.facebook.com",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://stats.g.doubleclick.net https://connect.facebook.net",
              "frame-src https://js.stripe.com https://hooks.stripe.com https://www.facebook.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Wix category URLs → nuovo sito italiano
      { source: '/category/twilly', destination: '/collezioni/twilly-como', permanent: true },
      { source: '/category/bellagio', destination: '/collezioni/bellagio', permanent: true },
      { source: '/category/cernobbio', destination: '/collezioni/cernobbio', permanent: true },
      { source: '/category/tremezzo', destination: '/collezioni/tremezzo', permanent: true },
      { source: '/category/varenna', destination: '/collezioni/varenna', permanent: true },
      { source: '/category/collezione-iconica', destination: '/collezioni/iconica', permanent: true },
      { source: '/category/collezione-primavera', destination: '/collezioni/primavera', permanent: true },
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

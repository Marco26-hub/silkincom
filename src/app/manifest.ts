import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SILKinCOM — Sciarpe e accessori in seta e cashmere',
    short_name: 'SILKinCOM',
    description:
      'Maison di sciarpe, foulard, pashmine e accessori in seta, cashmere, lana, lino e cotone. Made in Como, Italia.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FAF7F2',
    theme_color: '#1A1A1A',
    orientation: 'portrait-primary',
    lang: 'it',
    categories: ['shopping', 'lifestyle', 'fashion'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

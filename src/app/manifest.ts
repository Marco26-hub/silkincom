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
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon.svg', sizes: '180x180', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}

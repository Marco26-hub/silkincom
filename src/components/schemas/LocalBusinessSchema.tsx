/**
 * LocalBusinessSchema — JSON-LD for atelier / contact pages.
 *
 * Strengthens GEO/SEO entity recognition by exposing structured location,
 * hours, geo coordinates, and price range. Inject on /contatti, /atelier
 * and any page that references the physical Cermenate atelier.
 */
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.vercel.app';

export function LocalBusinessSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'ClothingStore'],
    '@id': `${BASE_URL}#atelier`,
    name: 'SILKinCOM — Atelier',
    legalName: 'SILKinCOM',
    url: BASE_URL,
    logo: `${BASE_URL}/logo-official.png`,
    image: `${BASE_URL}/og-image.jpg`,
    description:
      'Atelier SILKinCOM a Cermenate (Como). Maison italiana di accessori in seta, cashmere e fibre naturali pregiate. 100% Made in Como, tradizione tessile dal XV secolo.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Via dell\'Atelier',
      addressLocality: 'Cermenate',
      addressRegion: 'CO',
      postalCode: '22072',
      addressCountry: 'IT',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 45.7591,
      longitude: 9.1419,
    },
    telephone: '+39 031 0000000',
    email: 'info@silkincom.com',
    vatID: 'IT03786790133',
    taxID: '03786790133',
    priceRange: '€€€',
    currenciesAccepted: 'EUR',
    paymentAccepted: 'Visa, Mastercard, American Express, Apple Pay, Google Pay, PayPal, Bonifico',
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '10:00',
        closes: '13:00',
      },
    ],
    areaServed: [
      { '@type': 'Country', name: 'Italia' },
      { '@type': 'Place', name: 'Unione Europea' },
      { '@type': 'Place', name: 'Worldwide' },
    ],
    sameAs: [
      'https://www.instagram.com/silkincom.official/',
      'https://www.facebook.com/profile.php?id=61581900780447',
      'https://it.pinterest.com/silkincomofficial',
    ],
    founder: {
      '@type': 'Person',
      name: 'Marco Dibenedetto',
    },
    knowsAbout: [
      'Seta di Como',
      'Cashmere',
      'Tessitura artigianale',
      'Foulard di seta',
      'Pashmine',
      'Twilly',
      'Made in Italy',
    ],
    hasMap: 'https://www.google.com/maps/place/Cermenate+CO,+Italy',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

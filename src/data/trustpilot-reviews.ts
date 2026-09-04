export const TRUSTPILOT_PROFILE_URL =
  'https://it.trustpilot.com/review/silkincom.com';

export const TRUSTPILOT_SUMMARY = {
  trustScore: 4.2,
  reviewCount: 6,
  lastCheckedAt: '2026-09-04',
} as const;

export type TrustpilotReview = {
  id: string;
  author: string;
  title: string;
  body: string;
  rating: number;
  experiencedAt: string;
  url: string;
};

// Public service reviews copied from the SILKinCOM Trustpilot profile.
// Keep the wording faithful and link every quote to its original review.
export const TRUSTPILOT_REVIEWS: TrustpilotReview[] = [
  {
    id: '6a9997049c920a5067cff62b',
    author: 'Mauro Barontini',
    title: 'Ordinato il cappellino darsena blu',
    body: 'Ordinato il cappellino darsena blu , materiale di qualità e veramente bello,ricevuto in brevissimo tempo, molto soddisfatto della gestione dell ordine',
    rating: 5,
    experiencedAt: '2026-08-22',
    url: 'https://it.trustpilot.com/reviews/6a9997049c920a5067cff62b',
  },
  {
    id: '6a97eeb89ed5110a42727fe8',
    author: 'Borsieri Car Service srl',
    title: 'Serietà e professionalità',
    body: 'Non posso che fare i complimenti a tutto lo staff che mi ha seguito, sono stati professionali e veloci seguendo passo passo tutte le mie richieste.',
    rating: 5,
    experiencedAt: '2026-08-24',
    url: 'https://it.trustpilot.com/reviews/6a97eeb89ed5110a42727fe8',
  },
  {
    id: '6a96ccc15fc42d769cf0182f',
    author: 'Andrea Giulio Somaschini',
    title: 'Prodotti molto belli e con ottimo…',
    body: 'Prodotti molto belli e con ottimo rapporto qualità/ prezzo. Sicuramente comprerò ancora!!! Andrea',
    rating: 5,
    experiencedAt: '2026-08-10',
    url: 'https://it.trustpilot.com/reviews/6a96ccc15fc42d769cf0182f',
  },
  {
    id: '6a96c4df013706861d96b32a',
    author: 'Edoardo Dibenedetto',
    title: 'Esperienza ottima da provare',
    body: 'Un team eccezionale che ti segue in ogni passo, i prodotti sono di ottima qualità e consiglio a tutti di provare',
    rating: 5,
    experiencedAt: '2026-06-10',
    url: 'https://it.trustpilot.com/reviews/6a96c4df013706861d96b32a',
  },
  {
    id: '6a7a23b53125bb5860162b02',
    author: 'Micaela Malinverno',
    title: 'Veramente eccezionali',
    body: 'Manifattura top',
    rating: 5,
    experiencedAt: '2026-08-10',
    url: 'https://it.trustpilot.com/reviews/6a7a23b53125bb5860162b02',
  },
  {
    id: '6a5e39909e66a775f889a06f',
    author: 'Vincenzo Sapone',
    title: 'Prodotti veramente di eccellenza',
    body: 'Prodotti veramente di eccellenza, sia per la portabilità che per i tessuti, made in Como già di per se è una garanzia.',
    rating: 5,
    experiencedAt: '2026-07-17',
    url: 'https://it.trustpilot.com/reviews/6a5e39909e66a775f889a06f',
  },
];

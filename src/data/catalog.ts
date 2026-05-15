import productsJson from './products.json';

export type Material = 'seta' | 'cashmere' | 'lana' | 'lino' | 'cotone' | 'misto';

export type Product = {
  slug: string;
  name: string;
  sku: string;
  price: number;
  description: string;
  composition: string;
  dimensions: string;
  images: string[];
  category?: string;
  collections?: string[];
  material?: Material;
};

const products = productsJson as Product[];

// Detect material from composition string
function detectMaterial(composition: string): Material {
  const c = composition.toLowerCase();
  if (c.includes('cashmere') || c.includes('ws')) return 'cashmere';
  if (c.includes('lana') || c.includes('wo')) return 'lana';
  if (c.includes('seta') || c.includes('silk') || c.includes('se')) return 'seta';
  if (c.includes('lino') || c.includes('linen') || c.includes('li')) return 'lino';
  if (c.includes('cotone') || c.includes('cotton') || c.includes('co')) return 'cotone';
  return 'misto';
}

// Map product → category/collections/material by slug pattern
export const PRODUCTS: Product[] = products.map((p) => {
  const s = p.slug.toLowerCase();
  let category = '';
  let collections: string[] = [];
  const material = detectMaterial(p.composition);

  // Category mapping
  if (s.startsWith('bellagio')) category = 'bellagio';
  else if (s.startsWith('cernobbio')) category = 'cernobbio';
  else if (s.startsWith('tremezzo')) category = 'tremezzo';
  else if (s.startsWith('varenna')) category = 'varenna';
  else if (s.startsWith('como')) category = 'twilly-como';
  else if (s.startsWith('darsena')) category = 'darsena';
  else if (s.startsWith('lario')) category = 'lario';
  else if (s.startsWith('melzi')) category = 'melzi';
  else if (s.startsWith('riva')) category = 'riva';
  else if (s.startsWith('tivan')) category = 'tivan';

  // Collection mapping (products can belong to multiple)
  // Iconica: timeless pieces
  if (['bellagio', 'cernobbio', 'tremezzo', 'varenna', 'twilly-como'].includes(category)) {
    collections.push('iconica');
  }
  // Inverno: winter materials (cashmere, wool scarves/pashminas)
  if (['bellagio', 'cernobbio', 'tremezzo', 'varenna'].includes(category)) {
    collections.push('inverno');
  }
  // Primavera: spring/summer materials (cotton, linen)
  if (['darsena', 'lario', 'melzi', 'riva', 'tivan'].includes(category)) {
    collections.push('primavera');
  }

  return { ...p, category, collections, material };
});

// Categories with material/style information
const WIX = (id: string, w = 800, h = 1000) =>
  `https://static.wixstatic.com/media/${id}/v1/fill/w_${w},h_${h},al_c,q_90,usm_0.66_1.00_0.01/file.jpg`;

export const CATEGORIES = [
  { slug: 'bellagio',   name: 'Bellagio',    material: 'Cashmere', description: 'Pashmine in puro cashmere, ispirate alla raffinatezza del Lago di Como.', image: WIX('b58e91_6653f43860d34a5eb0143cae9523a134~mv2.jpg') },
  { slug: 'cernobbio',  name: 'Cernobbio',   material: 'Cashmere', description: 'Sciarpe in cashmere, eleganza discreta.',                                  image: WIX('a34b56_3ccd9aefbaca4c5d9363c8711f5b3338~mv2.jpg') },
  { slug: 'tremezzo',   name: 'Tremezzo',    material: 'Lana',     description: 'Sciarpe in lana, calore avvolgente.',                                       image: WIX('a34b56_1af2743a614c4ac1b255dd1e53c8f436~mv2.jpg') },
  { slug: 'varenna',    name: 'Varenna',     material: 'Lana',     description: 'Sciarpe luxury, leggerezza che dura.',                                       image: WIX('a34b56_e76f0bb5106c49df8f2ef2b5d8602b0e~mv2.jpg') },
  { slug: 'twilly-como',name: 'Twilly Como', material: 'Seta',     description: 'Il foulard a nastro in seta, reinterpretato.',                              image: WIX('b58e91_6e113b7ba95f4d81854d2300b10860e8~mv2.jpg') },
  { slug: 'darsena',    name: 'Darsena',     material: 'Cotone',   description: 'T-shirt e cappellini in cotone, eleganza casual.',                           image: WIX('a34b56_0f40416a402e4011a78dba5f2849cf6f~mv2.jpg') },
  { slug: 'lario',      name: 'Lario',       material: 'Cotone',   description: 'T-shirt in cotone pregiato, Made in Como.',                                  image: WIX('a34b56_1c703913173a458d848ef300b9e954ba~mv2.jpg') },
  { slug: 'melzi',      name: 'Melzi',       material: 'Lino',     description: 'Camicie in lino, freschezza estiva sul Lago.',                               image: WIX('a34b56_4cdb7894efaa4a128d5fb0714b80e743~mv2.jpg') },
  { slug: 'riva',       name: 'Riva',        material: 'Lino',     description: 'Foulard e camicie in misto lino e cotone.',                                  image: WIX('a34b56_c17c8b8c3ed9469baee1b992666ad11b~mv2.jpg') },
  { slug: 'tivan',      name: 'Tivan',       material: 'Seta',     description: 'Edizione limitata in seta pregiata.',                                        image: WIX('a34b56_7f5a6eb5f5ec474098fb2a72445ec974~mv2.jpg') },
];

// Main collections shown as featured
export const COLLECTIONS = [
  {
    slug: 'inverno',
    name: 'Collezione Inverno',
    tagline: 'Calore avvolgente delle fibre nobili',
    description: 'Pashmine in cashmere, sciarpe in lana e accessori pensati per la stagione fredda. La tradizione tessile comasca incontra il comfort delle migliori fibre invernali.',
    image: '/instagram/ig-06.jpg',
  },
  {
    slug: 'iconica',
    name: 'Collezione Iconica',
    tagline: 'L\'essenza del tuo stile, firmata Como',
    description: 'I pezzi che rappresentano l\'anima di SILKinCOM. Sciarpe e foulard in seta, cashmere e lana, lavorati interamente nel distretto serico comasco.',
    image: '/instagram/ig-02.jpg',
  },
  {
    slug: 'primavera',
    name: 'Collezione Primavera & Estate',
    tagline: 'Toni del lago al risveglio',
    description: 'La nuova stagione si apre con cotoni e lini leggeri, t-shirt e camicie pensate per le mezze stagioni sul Lario.',
    image: '/instagram/ig-01.jpg',
  },
];

// Material info for filtering UI
export const MATERIALS = [
  { slug: 'cashmere', name: 'Cashmere', code: 'WS', description: 'Fibra pregiata di origine asiatica, calda e leggera.' },
  { slug: 'lana', name: 'Lana', code: 'WO', description: 'Naturalmente traspirante e termoregolatrice.' },
  { slug: 'seta', name: 'Seta', code: 'SE', description: 'La seta di Como, lucentezza e raffinatezza senza tempo.' },
  { slug: 'lino', name: 'Lino', code: 'LI', description: 'Freschezza naturale per l\'estate mediterranea.' },
  { slug: 'cotone', name: 'Cotone', code: 'CO', description: 'Cotone naturale di qualità superiore, morbidezza setosa.' },
];

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductsByCategory(category: string): Product[] {
  return PRODUCTS.filter((p) => p.category === category);
}

export function getProductsByCollection(collection: string): Product[] {
  return PRODUCTS.filter((p) => p.collections?.includes(collection));
}

export function getProductsByMaterial(material: Material): Product[] {
  return PRODUCTS.filter((p) => p.material === material);
}

export function getFeaturedProducts(limit = 8): Product[] {
  return PRODUCTS.slice(0, limit);
}

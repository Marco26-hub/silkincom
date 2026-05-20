import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { localizedAlternates } from '@/i18n/routing';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Press Room — Media kit SILKinCOM',
    description:
      'Press kit, logo, biografia e contatti per giornalisti e media. SILKinCOM, maison di seta e cashmere Made in Como.',
    alternates: localizedAlternates(locale, '/press'),
  };
}

const pressSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${BASE_URL}/press#webpage`,
  url: `${BASE_URL}/press`,
  name: 'Press Room SILKinCOM',
  description:
    'Materiali stampa e media kit di SILKinCOM. Contatti per giornalisti, immagini ad alta risoluzione, logo brand.',
  about: { '@id': `${BASE_URL}/#organization` },
  publisher: { '@id': `${BASE_URL}/#organization` },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
    { '@type': 'ListItem', position: 2, name: 'Press', item: `${BASE_URL}/press` },
  ],
};

export default function PressPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pressSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section className="pt-44 pb-16 bg-ivory">
        <div className="max-w-[900px] mx-auto px-6 lg:px-10 text-center">
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">
            Press Room
          </span>
          <h1 className="font-display font-light text-5xl md:text-6xl lg:text-7xl leading-[1.05] text-soft-black mb-6">
            Media kit
          </h1>
          <p className="font-display italic text-xl md:text-2xl text-soft-black/80">
            Materiali per giornalisti, media e partner editoriali
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-warm-white">
        <div className="max-w-3xl mx-auto px-6 prose prose-lg font-light text-soft-black/85 leading-relaxed prose-headings:font-display prose-headings:font-light prose-headings:text-soft-black prose-a:text-gold-primary hover:prose-a:text-gold-dark">
          <h2>Boilerplate</h2>
          <p>
            <strong>SILKinCOM</strong> è una maison italiana di accessori in seta, cashmere e fibre
            naturali pregiate. Sciarpe, foulard, twilly e pashmine interamente disegnate e
            confezionate nel distretto serico di Como, capitale italiana del tessile di lusso dal
            XV secolo. Fondatore: Marco Dibenedetto. Sede: Cermenate (CO), Italia.
          </p>

          <h2>Fact sheet</h2>
          <ul>
            <li><strong>Brand</strong>: SILKinCOM</li>
            <li><strong>Fondatore</strong>: <Link href="/maison/marco-dibenedetto">Marco Dibenedetto</Link></li>
            <li><strong>Sede</strong>: Via Giuseppe Verdi 2/B, 22072 Cermenate (CO), Italia</li>
            <li><strong>P.IVA</strong>: IT03786790133</li>
            <li><strong>Produzione</strong>: 100% Made in Como (distretto serico)</li>
            <li><strong>Materiali</strong>: seta di Como, cashmere Mongolia (micronaggio &lt; 15,5 micron), lana merino, lino europeo, cotone extra-lungo</li>
            <li><strong>Lingue del sito</strong>: 7 native (it, en, es, fr, de, pt, nl)</li>
            <li><strong>Sito</strong>: <a href="https://silkincom.com">silkincom.com</a></li>
          </ul>

          <h2>Logo e immagini</h2>
          <ul>
            <li><a href="/logo-official.svg" target="_blank" rel="noopener">Logo SVG (vettoriale)</a></li>
            <li><a href="/logo-official.png" target="_blank" rel="noopener">Logo PNG (raster)</a></li>
            <li><a href="/logo-gold.png" target="_blank" rel="noopener">Logo gold variant</a></li>
            <li><a href="/og-image.jpg" target="_blank" rel="noopener">Brand cover image</a></li>
          </ul>

          <h2>Contatti stampa</h2>
          <ul>
            <li>Email media: <a href="mailto:info@silkincom.com">info@silkincom.com</a></li>
            <li>Argomenti: Made in Como, distretto tessile, cashmere/seta, heritage, fondatore</li>
            <li>Disponibili: interviste con il fondatore, visite all'atelier, sample prodotti</li>
          </ul>

          <h2>Storie a portata di mano</h2>
          <p>
            Approfondimenti pronti per uso editoriale, disponibili sul Journal SILKinCOM:
          </p>
          <ul>
            <li><Link href="/trame-di-como/storia-della-seta-a-como">Storia della seta a Como: sei secoli di filo e telaio</Link> — pillar heritage</li>
            <li><Link href="/trame-di-como/come-riconoscere-seta-vera">Come riconoscere la seta vera: 7 prove pratiche</Link></li>
            <li><Link href="/trame-di-como/pashmina-vs-sciarpa-differenze">Pashmina o sciarpa: tutte le differenze</Link></li>
            <li><Link href="/trame-di-como/cashmere-mongolo-vs-cinese">Cashmere mongolo o cinese: come riconoscerli</Link></li>
          </ul>

          <h2>Social</h2>
          <ul>
            <li>Instagram: <a href="https://www.instagram.com/silkincom.official/" target="_blank" rel="noopener">@silkincom.official</a></li>
            <li>Facebook: <a href="https://www.facebook.com/profile.php?id=61581900780447" target="_blank" rel="noopener">SILKinCOM</a></li>
            <li>Pinterest: <a href="https://it.pinterest.com/silkincomofficial" target="_blank" rel="noopener">silkincomofficial</a></li>
          </ul>
        </div>
      </section>
    </>
  );
}

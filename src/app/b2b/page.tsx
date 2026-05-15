import Link from 'next/link';
import { ArrowRight, Hotel, Gift, Briefcase } from 'lucide-react';
import { LocalBusinessSchema } from '@/components/schemas/LocalBusinessSchema';

export const metadata = {
  title: 'B2B — Hospitality & Corporate Gifting',
  description:
    'Programma SILKinCOM per hotel di lusso, corporate gifting e clientela aziendale. Foulard, sciarpe e accessori in seta personalizzabili con condizioni dedicate.',
  alternates: { canonical: '/b2b' },
};

export default function B2BPage() {
  return (
    <>
      <LocalBusinessSchema />

      {/* Hero */}
      <section className="pt-44 pb-20 bg-ivory">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 text-center">
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">
            Programma B2B
          </span>
          <span className="block w-px h-10 bg-gold-primary mx-auto mb-8" />
          <h1 className="font-display font-light text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight mb-8">
            Hospitality &amp;<br />
            <em className="italic text-gold-primary">Corporate Gifting</em>
          </h1>
          <p className="max-w-2xl mx-auto text-base md:text-lg font-light leading-relaxed text-soft-black/70">
            La maison comasca dedicata ad hotel di lusso, brand di alta gamma e
            corporate gifting. Eredità tessile del distretto serico più antico
            d&apos;Europa, condizioni riservate per ordini superiori a 20 pezzi.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-20 md:py-28 bg-warm-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
            {[
              {
                icon: Hotel,
                title: 'Hotel di lusso',
                body: 'Welcome amenities, foulard di benvenuto, accessori personalizzati con il monogramma della struttura. Ideali per hotel 5★ del Lago di Como, Milano e principali destinazioni italiane.',
              },
              {
                icon: Gift,
                title: 'Corporate gifting',
                body: 'Regali aziendali per clienti e collaboratori. Confezione regalo Maison inclusa, packaging personalizzabile, possibilità di card dedicata. Da 20 pezzi.',
              },
              {
                icon: Briefcase,
                title: 'White label & private label',
                body: 'Capsule esclusive realizzate sul vostro brand. Tempi 4-8 settimane in base alla complessità. Minimo 50 pezzi per personalizzazione completa.',
              },
            ].map((p) => (
              <div key={p.title} className="text-center md:text-left">
                <span className="inline-flex w-12 h-12 items-center justify-center border border-gold-primary/40 mb-6">
                  <p.icon className="w-5 h-5 text-gold-primary stroke-1" />
                </span>
                <h3 className="font-display font-light text-2xl md:text-3xl mb-4">
                  {p.title}
                </h3>
                <p className="text-sm font-light leading-relaxed text-soft-black/70">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-soft-black text-warm-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">
            Richiedi listino
          </span>
          <span className="block w-px h-8 bg-gold-primary mx-auto mb-7" />
          <h2 className="font-display font-light text-3xl md:text-4xl mb-6">
            Parliamo del vostro progetto.
          </h2>
          <p className="text-sm font-light text-warm-white/70 mb-10 leading-relaxed">
            Inviateci una richiesta dettagliata: tipo di prodotti, quantità,
            tempistiche, eventuale personalizzazione. Vi ricontatteremo entro 24h
            con listino dedicato.
          </p>
          <Link
            href="mailto:b2b@silkincom.com?subject=Richiesta%20Listino%20B2B"
            className="inline-flex items-center gap-3 px-12 py-5 bg-gold-primary text-soft-black text-[10px] uppercase tracking-[0.4em] hover:bg-warm-white transition-all duration-500 group"
          >
            Scrivi al programma B2B
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </>
  );
}

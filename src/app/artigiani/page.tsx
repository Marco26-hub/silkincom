import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { LocalBusinessSchema } from '@/components/schemas/LocalBusinessSchema';

export const metadata = {
  title: 'I Nostri Artigiani — SILKinCOM',
  description:
    'I tessitori, gli stampatori e gli artigiani comaschi che danno vita ai prodotti SILKinCOM. Mestieri tramandati da generazioni nel distretto serico del Lago di Como.',
  alternates: { canonical: '/artigiani' },
};

export default function ArtigianiPage() {
  const artisans = [
    {
      name: 'Lorenzo M.',
      role: 'Maestro Tessitore',
      city: 'Cermenate (CO)',
      image: '/artisans/telaio-artigiano-principale.png',
      alt: 'Artigiano al lavoro davanti a un telaio tessile in legno',
      caption: 'Telaio manuale in lavorazione',
      story:
        'Segue il ritmo del telaio, controllando intreccio, tensione e passaggio dei fili destinati a sciarpe e foulard in seta.',
    },
    {
      name: 'Telaio SILKinCOM',
      role: 'Tessitura Jacquard',
      city: 'Distretto Comasco',
      image: '/artisans/telaio-silkincom-blu.png',
      alt: 'Telaio Jacquard al lavoro su sciarpa SILKinCOM in seta blu e bianca',
      caption: 'Tessitura SILKinCOM in corso',
      story:
        'Il telaio Jacquard intreccia ordito e trama in tempo reale: ogni passaggio compone il logo SILKinCOM e il disegno geometrico della collezione.',
    },
    {
      name: 'Twill Comasco',
      role: 'Dettaglio Jacquard',
      city: 'Como',
      image: '/artisans/twill-dettaglio-jacquard.png',
      alt: 'Dettaglio macro del twill di seta blu con motivo jacquard SILKinCOM',
      caption: 'Trama a fili contati',
      story:
        'Macro del twill appena uscito dal telaio: il disegno è ottenuto a fili contati, non stampato — è la firma della seta comasca.',
    },
  ];

  return (
    <>
      <LocalBusinessSchema />

      {/* Hero */}
      <section className="pt-44 pb-20 bg-ivory">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 text-center">
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">
            Le Mani che Tessono
          </span>
          <span className="block w-px h-10 bg-gold-primary mx-auto mb-8" />
          <h1 className="font-display font-light text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight mb-8">
            I nostri <em className="italic text-gold-primary">artigiani</em>
          </h1>
          <p className="max-w-2xl mx-auto text-base md:text-lg font-light leading-relaxed text-soft-black/70">
            Tessitori, stampatori, sarti del distretto comasco. Ogni capo
            SILKinCOM porta la firma di mani che tramandano il mestiere da
            generazioni.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden py-20 md:py-28 bg-warm-white">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-beige-light/70 to-warm-white" />
        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8 md:gap-12 items-end mb-14 md:mb-20">
            <div>
              <span className="block text-[10px] uppercase tracking-[0.4em] text-gold-dark mb-4">
                Dentro la tessitura
              </span>
              <h2 className="font-display font-light text-4xl md:text-5xl lg:text-6xl leading-[1.05]">
                Dal telaio comasco al foulard
              </h2>
            </div>
            <p className="font-display italic text-xl md:text-2xl text-soft-black/70 leading-relaxed max-w-3xl lg:justify-self-end">
              Telai, fili e seta diventano sciarpe e foulard nel distretto
              comasco: ogni passaggio serve a dare mano, caduta e luce al capo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {artisans.map((a) => (
              <div
                key={a.name}
                className="group overflow-hidden border border-pearl-grey/70 bg-ivory shadow-soft transition-all duration-500 hover:border-gold-primary/60 hover:shadow-luxe"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-beige-light">
                  <Image
                    src={a.image}
                    alt={a.alt}
                    fill
                    sizes="(min-width: 1024px) 31vw, (min-width: 640px) 47vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-soft-black/65 to-transparent pt-16 pb-5 px-5">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-warm-white/85">
                      {a.caption}
                    </p>
                  </div>
                </div>
                <div className="p-7 md:p-9">
                  <div className="flex items-start justify-between gap-5 mb-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.35em] text-gold-dark mb-3">
                        {a.role}
                      </p>
                      <h3 className="font-display text-2xl font-light leading-tight">
                        {a.name}
                      </h3>
                    </div>
                    <span className="mt-1 h-px w-12 shrink-0 bg-gold-primary" />
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-lake-blue mb-5">
                    {a.city}
                  </p>
                  <p className="text-sm text-soft-black/75 font-light leading-relaxed">
                    {a.story}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link
              href="/la-nostra-storia"
              className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-soft-black border-b border-soft-black hover:border-gold-primary hover:text-gold-primary pb-1 transition-colors group"
            >
              Scopri la nostra storia
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

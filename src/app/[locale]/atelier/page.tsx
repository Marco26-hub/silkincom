import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { LocalBusinessSchema } from '@/components/schemas/LocalBusinessSchema';

export const metadata = {
  title: 'Atelier — Su misura',
  description: 'Sciarpe e foulard personalizzati: scegli colori, dimensioni e finiture insieme ai nostri tessitori comaschi.',
};

export default async function AtelierPage() {
  const t = await getTranslations('atelier');

  const steps = [
    { n: '01', t: t('step1Title'), d: t('step1Body') },
    { n: '02', t: t('step2Title'), d: t('step2Body') },
    { n: '03', t: t('step3Title'), d: t('step3Body') },
    { n: '04', t: t('step4Title'), d: t('step4Body') },
  ];

  return (
    <>
      <LocalBusinessSchema />
      <section className="relative h-[80vh] min-h-[560px] overflow-hidden">
        <Image
          src="https://static.wixstatic.com/media/11062b_07ccc5eabef74564bafa19a17ab1fd0b~mv2_d_5262_3508_s_4_2.jpg/v1/fill/w_2400,h_1600,al_c,q_90,usm_0.66_1.00_0.01/file.jpg"
          alt="Atelier SILKinCOM"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-soft-black/45" />
        <div className="relative z-10 h-full flex items-center justify-center text-center text-warm-white px-6">
          <div className="max-w-3xl">
            <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-6">{t('eyebrow')}</span>
            <h1 className="font-display font-light text-5xl md:text-7xl lg:text-[88px] leading-[1.05] mb-8">
              {t('titleP1')}<br />
              <em className="italic text-gold-primary">{t('titleAccent')}</em>
            </h1>
            <p className="text-lg font-light text-warm-white/85 max-w-xl mx-auto leading-relaxed">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </section>

      <section className="py-24 bg-ivory">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-display font-light text-4xl md:text-5xl mb-10 text-center">
            {t('howItWorks')}
          </h2>
          <div className="space-y-10">
            {steps.map((s) => (
              <div key={s.n} className="grid grid-cols-[60px_1fr] gap-6 items-start">
                <span className="font-display text-3xl text-gold-primary">{s.n}</span>
                <div>
                  <h3 className="font-display text-2xl font-light mb-2">{s.t}</h3>
                  <p className="text-soft-black/75 font-light leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-warm-white">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display font-light text-4xl md:text-5xl mb-10 text-center">
            {t('bookAppointment')}
          </h2>
          <div className="mb-8 text-center">
            <Link
              href="/atelier/ai-upload"
              className="inline-flex px-6 py-3 border border-soft-black text-[11px] uppercase tracking-[0.25em] hover:bg-soft-black hover:text-warm-white transition-all duration-300"
            >
              {t('orAiUpload')}
            </Link>
          </div>
          <form className="space-y-5">
            <input placeholder={t('formName')} className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors" />
            <input type="email" placeholder={t('formEmail')} className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors" />
            <input type="tel" placeholder={t('formPhone')} className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors" />
            <textarea rows={5} placeholder={t('formMessage')} className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors resize-none" />
            <button type="submit" className="w-full px-10 py-4 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300">
              {t('submit')}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

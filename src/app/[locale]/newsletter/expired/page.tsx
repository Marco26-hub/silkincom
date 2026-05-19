import { Link } from '@/i18n/navigation';
import { AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Link scaduto',
  robots: { index: false },
};

export default function ExpiredPage() {
  return (
    <section className="pt-44 pb-32 bg-warm-white min-h-[70vh]">
      <div className="max-w-md mx-auto px-6 text-center">
        <span className="inline-flex w-14 h-14 items-center justify-center border border-pearl-grey rounded-full mb-6">
          <AlertCircle className="w-6 h-6 text-soft-black/50 stroke-1" />
        </span>
        <h1 className="font-display font-light text-4xl md:text-5xl mb-4">
          Link non valido
        </h1>
        <p className="text-sm text-soft-black/70 font-light leading-relaxed mb-10">
          Il link di conferma è scaduto o non è più valido. Si iscriva nuovamente alla newsletter dal footer del sito.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-soft-black border-b border-soft-black hover:border-gold-primary hover:text-gold-primary pb-1"
        >
          Torna alla home
        </Link>
      </div>
    </section>
  );
}

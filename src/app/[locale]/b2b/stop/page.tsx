import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Preferenze comunicazioni B2B | SILKinCOM',
  robots: { index: false, follow: false },
};

type StopPageProps = {
  searchParams: Promise<{
    lead?: string;
    token?: string;
    done?: string;
    error?: string;
    test?: string;
  }>;
};

export default async function B2BStopPage({ searchParams }: StopPageProps) {
  const params = await searchParams;
  const isDone = params.done === '1';
  const isError = params.error === '1';
  const isTest = params.test === '1';
  const canConfirm = Boolean(params.lead && params.token && !isDone && !isError);

  return (
    <section className="min-h-screen bg-ivory px-6 py-28 text-soft-black">
      <div className="mx-auto max-w-xl border border-gold-primary/30 bg-warm-white px-8 py-14 text-center md:px-14">
        <p className="mb-5 text-[10px] uppercase tracking-[0.45em] text-gold-primary">
          SILKinCOM · Partnership Office
        </p>
        <span className="mx-auto mb-8 block h-8 w-px bg-gold-primary" />

        {isDone ? (
          <>
            <h1 className="mb-5 font-display text-4xl font-light">Richiesta registrata.</h1>
            <p className="mb-8 text-sm font-light leading-relaxed text-soft-black/70">
              Non riceverà ulteriori proposte B2B da SILKinCOM. La preferenza è stata registrata immediatamente.
            </p>
          </>
        ) : isTest ? (
          <>
            <h1 className="mb-5 font-display text-4xl font-light">Anteprima STOP.</h1>
            <p className="mb-8 text-sm font-light leading-relaxed text-soft-black/70">
              Questa è una prova: nessun contatto è stato modificato.
            </p>
          </>
        ) : isError || !canConfirm ? (
          <>
            <h1 className="mb-5 font-display text-4xl font-light">Link non valido.</h1>
            <p className="mb-8 text-sm font-light leading-relaxed text-soft-black/70">
              La richiesta non è stata applicata. Può rispondere direttamente a b2b@silkincom.com indicando STOP.
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-5 font-display text-4xl font-light">Conferma interruzione.</h1>
            <p className="mb-8 text-sm font-light leading-relaxed text-soft-black/70">
              Confermi per non ricevere ulteriori proposte di collaborazione B2B da SILKinCOM.
            </p>
            <form action="/api/b2b/unsubscribe" method="post" className="mb-8">
              <input type="hidden" name="lead" value={params.lead} />
              <input type="hidden" name="token" value={params.token} />
              <button
                type="submit"
                className="bg-soft-black px-8 py-4 text-[10px] uppercase tracking-[0.3em] text-warm-white transition-colors hover:bg-gold-primary hover:text-soft-black"
              >
                Conferma STOP
              </button>
            </form>
          </>
        )}

        <Link
          href="/"
          className="text-[10px] uppercase tracking-[0.25em] text-soft-black/60 underline underline-offset-4"
        >
          Torna a SILKinCOM
        </Link>
      </div>
    </section>
  );
}

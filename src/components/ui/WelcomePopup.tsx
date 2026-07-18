'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Check, Copy } from 'lucide-react';
import { useLocale } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { useAntibot } from '@/components/antibot/useAntibot';

// First-order email-capture. The store draws traffic but captures almost no
// emails, so every product-viewer who doesn't buy is lost forever. This modal
// trades a 10% welcome code (coupon BENVENUTO10, one per customer) for an
// email, then hands the visitor the code on the spot. Shows once per browser,
// after a delay or on desktop exit-intent, and never on checkout/auth flows.
const STORAGE_KEY = 'silk_welcome_v1';
const CODE = 'BENVENUTO10';
const SHOW_AFTER_MS = 14000;

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const T: Record<string, Record<string, string>> = {
  eyebrow: { it: 'Maison SILKinCOM', en: 'Maison SILKinCOM', es: 'Maison SILKinCOM', fr: 'Maison SILKinCOM', de: 'Maison SILKinCOM', pt: 'Maison SILKinCOM', nl: 'Maison SILKinCOM' },
  headline: { it: '−10% sul primo ordine', en: '−10% on your first order', es: '−10% en tu primer pedido', fr: '−10% sur votre première commande', de: '−10% auf Ihre erste Bestellung', pt: '−10% na sua primeira compra', nl: '−10% op je eerste bestelling' },
  sub: {
    it: 'Iscriviti e ricevi subito il tuo codice. Anteprime, edizioni limitate e trame dal Lago di Como.',
    en: 'Subscribe and get your code right away. Previews, limited editions and stories from Lake Como.',
    es: 'Suscríbete y recibe tu código al instante. Adelantos, ediciones limitadas e historias del Lago de Como.',
    fr: 'Inscrivez-vous et recevez votre code aussitôt. Avant-premières, éditions limitées et récits du Lac de Côme.',
    de: 'Abonnieren und Code sofort erhalten. Vorschauen, limitierte Editionen und Geschichten vom Comer See.',
    pt: 'Subscreva e receba já o seu código. Antevisões, edições limitadas e histórias do Lago de Como.',
    nl: 'Schrijf je in en ontvang direct je code. Previews, limited editions en verhalen van het Comomeer.',
  },
  placeholder: { it: 'La tua email', en: 'Your email', es: 'Tu email', fr: 'Votre e-mail', de: 'Deine E-Mail', pt: 'O seu email', nl: 'Je e-mail' },
  cta: { it: 'Ricevi il codice', en: 'Get my code', es: 'Recibir el código', fr: 'Recevoir le code', de: 'Code erhalten', pt: 'Receber o código', nl: 'Ontvang de code' },
  sending: { it: 'Invio…', en: 'Sending…', es: 'Enviando…', fr: 'Envoi…', de: 'Senden…', pt: 'A enviar…', nl: 'Versturen…' },
  dismiss: { it: 'No grazie', en: 'No thanks', es: 'No, gracias', fr: 'Non merci', de: 'Nein danke', pt: 'Não, obrigado', nl: 'Nee bedankt' },
  successTitle: { it: 'Benvenuto nella Maison', en: 'Welcome to the Maison', es: 'Bienvenido a la Maison', fr: 'Bienvenue dans la Maison', de: 'Willkommen in der Maison', pt: 'Bem-vindo à Maison', nl: 'Welkom bij de Maison' },
  successText: {
    it: 'Ecco il tuo −10% sul primo ordine. Inseriscilo al checkout.',
    en: 'Here is your −10% on the first order. Enter it at checkout.',
    es: 'Aquí tienes tu −10% en el primer pedido. Introdúcelo al pagar.',
    fr: 'Voici votre −10% sur la première commande. À saisir au paiement.',
    de: 'Hier Ihr −10% auf die erste Bestellung. An der Kasse eingeben.',
    pt: 'Aqui está o seu −10% na primeira compra. Insira no checkout.',
    nl: 'Hier is je −10% op de eerste bestelling. Voer het in bij het afrekenen.',
  },
  copied: { it: 'Copiato', en: 'Copied', es: 'Copiado', fr: 'Copié', de: 'Kopiert', pt: 'Copiado', nl: 'Gekopieerd' },
  invalid: { it: 'Email non valida', en: 'Invalid email', es: 'Email no válido', fr: 'E-mail invalide', de: 'Ungültige E-Mail', pt: 'Email inválido', nl: 'Ongeldig e-mailadres' },
  erroreGeneric: { it: 'Errore, riprova', en: 'Error, try again', es: 'Error, inténtalo de nuevo', fr: 'Erreur, réessayez', de: 'Fehler, erneut versuchen', pt: 'Erro, tente de novo', nl: 'Fout, probeer opnieuw' },
};

export function WelcomePopup() {
  const locale = useLocale();
  const pathname = usePathname();
  const tr = (m: Record<string, string>) => m[locale] ?? m.en ?? m.it;
  const { fields, Honeypot } = useAntibot();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Never interrupt checkout or auth flows.
  const suppressed =
    pathname?.startsWith('/checkout') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/account');

  useEffect(() => {
    if (suppressed) return;
    if (typeof window === 'undefined') return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }

    let fired = false;
    const show = () => {
      if (fired) return;
      fired = true;
      setOpen(true);
      cleanup();
    };
    const timer = window.setTimeout(show, SHOW_AFTER_MS);
    // Desktop exit-intent: cursor leaves through the top of the viewport.
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) show();
    };
    // Arm exit-intent only after a few seconds so it can't fire instantly.
    const armAt = window.setTimeout(() => {
      document.addEventListener('mouseout', onLeave);
    }, 4000);
    function cleanup() {
      window.clearTimeout(timer);
      window.clearTimeout(armAt);
      document.removeEventListener('mouseout', onLeave);
    }
    return cleanup;
  }, [suppressed]);

  useEffect(() => {
    if (open && !done) inputRef.current?.focus();
  }, [open, done]);

  const persist = (v: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* private mode — popup simply reappears next session */
    }
  };

  const close = () => {
    setOpen(false);
    persist(done ? 'subscribed' : 'dismissed');
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, done]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RX.test(value)) {
      setError(tr(T.invalid));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, source: 'popup-welcome', ...fields() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || tr(T.erroreGeneric));
      setDone(true);
      persist('subscribed');
    } catch (err) {
      setError(err instanceof Error ? err.message : tr(T.erroreGeneric));
    } finally {
      setLoading(false);
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — code is visible for manual copy */
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          role="dialog"
          aria-modal="true"
          aria-label={tr(T.headline)}
        >
          <button
            aria-hidden
            tabIndex={-1}
            onClick={close}
            className="absolute inset-0 bg-soft-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="relative w-full max-w-md overflow-hidden border border-gold-primary/30 bg-[#11100e] px-8 py-12 text-center text-warm-white shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] sm:px-12"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.14),transparent_55%)]" />
            <button
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 text-warm-white/50 transition-colors hover:text-gold-primary"
            >
              <X className="h-5 w-5" strokeWidth={1.4} />
            </button>

            <div className="relative">
              <span className="mb-5 block text-[9px] uppercase tracking-[0.48em] text-gold-primary">
                {tr(T.eyebrow)}
              </span>

              {!done ? (
                <>
                  <h2 className="font-display text-4xl font-light leading-[1.05] tracking-[-0.02em] sm:text-5xl">
                    {tr(T.headline)}
                  </h2>
                  <p className="mx-auto mt-5 max-w-sm text-sm font-light leading-[1.75] text-warm-white/60">
                    {tr(T.sub)}
                  </p>
                  <form onSubmit={submit} className="mt-8 flex flex-col gap-3" noValidate>
                    <Honeypot />
                    <input
                      ref={inputRef}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder={tr(T.placeholder)}
                      disabled={loading}
                      className="w-full border-0 border-b border-warm-white/25 bg-transparent px-0 py-3 text-center text-sm text-warm-white placeholder:text-warm-white/30 transition-colors focus:border-gold-primary focus:outline-none disabled:opacity-50"
                    />
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-2 w-full bg-gold-primary px-8 py-4 text-[10px] uppercase tracking-[0.3em] text-soft-black transition-all duration-300 hover:bg-warm-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? tr(T.sending) : tr(T.cta)}
                    </button>
                  </form>
                  <button
                    onClick={close}
                    className="mt-5 text-[10px] uppercase tracking-[0.25em] text-warm-white/35 transition-colors hover:text-warm-white/60"
                  >
                    {tr(T.dismiss)}
                  </button>
                </>
              ) : (
                <>
                  <h2 className="font-display text-4xl font-light leading-[1.05] tracking-[-0.02em] sm:text-5xl">
                    {tr(T.successTitle)}
                  </h2>
                  <p className="mx-auto mt-5 max-w-sm text-sm font-light leading-[1.75] text-warm-white/60">
                    {tr(T.successText)}
                  </p>
                  <button
                    onClick={copy}
                    className="group mx-auto mt-8 flex w-full items-center justify-between gap-4 border border-dashed border-gold-primary/50 bg-gold-primary/5 px-6 py-5 transition-colors hover:border-gold-primary"
                  >
                    <span className="font-display text-2xl tracking-[0.15em] text-gold-primary">{CODE}</span>
                    <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-warm-white/60 group-hover:text-gold-primary">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? tr(T.copied) : 'Copia'}
                    </span>
                  </button>
                  <button
                    onClick={close}
                    className="mt-8 w-full bg-warm-white px-8 py-4 text-[10px] uppercase tracking-[0.3em] text-soft-black transition-colors hover:bg-gold-primary"
                  >
                    {locale === 'it' ? 'Inizia lo shopping' : locale === 'en' ? 'Start shopping' : locale === 'es' ? 'Empezar a comprar' : locale === 'fr' ? 'Commencer les achats' : locale === 'de' ? 'Jetzt shoppen' : locale === 'pt' ? 'Começar a comprar' : 'Begin met shoppen'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

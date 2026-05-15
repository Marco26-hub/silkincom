'use client';

import { useEffect, useState } from 'react';
import { Settings, Truck, CreditCard, Globe, Mail } from 'lucide-react';

type StoreSettings = {
  free_shipping_threshold: number;
  standard_shipping_cost: number;
  vat_rate: number;
  store_name: string;
  store_email: string;
};

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8 max-w-[900px]">
      <div>
        <h1 className="font-display text-4xl mb-1">Impostazioni</h1>
        <p className="text-soft-grey text-sm">Configurazione negozio</p>
      </div>
      <ShippingSection />
      <PaymentSection />
      <StoreSection />
      <EmailSection />
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-pearl-grey bg-white p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-4 h-4 text-gold-primary" />
        <h2 className="text-sm font-medium uppercase tracking-[0.15em]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ShippingSection() {
  const [threshold, setThreshold] = useState('');
  const [cost, setCost] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data: StoreSettings) => {
        setThreshold(String(data.free_shipping_threshold ?? 200));
        setCost(String(data.standard_shipping_cost ?? 9));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        free_shipping_threshold: Number(threshold),
        standard_shipping_cost: Number(cost),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg({ type: 'ok', text: 'Salvato' });
    } else {
      const d = await res.json();
      setMsg({ type: 'err', text: d.error ?? 'Errore' });
    }
  }

  return (
    <Section icon={Truck} title="Spedizione">
      {loading ? (
        <p className="text-xs text-soft-grey">Caricamento...</p>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">
                Soglia spedizione gratuita (€)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className={cls}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">
                Costo spedizione standard (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className={cls}
              />
            </div>
          </div>
          {msg && (
            <p className={`text-xs px-3 py-2 ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Salva spedizione'}
          </button>
        </form>
      )}
    </Section>
  );
}

function PaymentSection() {
  const stripeMode = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live') ? 'LIVE' : 'TEST';

  return (
    <Section icon={CreditCard} title="Pagamenti">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Modalità Stripe</label>
          <div className={`px-3 py-2 text-sm border ${stripeMode === 'LIVE' ? 'border-green-300 bg-green-50 text-green-800' : 'border-yellow-300 bg-yellow-50 text-yellow-800'}`}>
            {stripeMode === 'LIVE' ? 'Produzione (LIVE)' : 'Test mode'}
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Metodi pagamento</label>
          <div className="px-3 py-2 text-sm border border-pearl-grey bg-ivory">
            Carte di credito · Apple Pay · Google Pay
          </div>
        </div>
      </div>
      <div className="bg-ivory border border-pearl-grey/60 p-3 text-xs text-soft-grey">
        Stripe automatic_payment_methods attivo. Configura metodi aggiuntivi dalla dashboard Stripe.
      </div>
    </Section>
  );
}

function StoreSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [vatRate, setVatRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data: StoreSettings) => {
        setName(String(data.store_name ?? 'SILKinCOM'));
        setEmail(String(data.store_email ?? 'info@silkincom.com'));
        setVatRate(String(data.vat_rate ?? 22));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_name: name,
        store_email: email,
        vat_rate: Number(vatRate),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg({ type: 'ok', text: 'Salvato' });
    } else {
      const d = await res.json();
      setMsg({ type: 'err', text: d.error ?? 'Errore' });
    }
  }

  return (
    <Section icon={Globe} title="Negozio">
      {loading ? (
        <p className="text-xs text-soft-grey">Caricamento...</p>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Nome negozio</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={cls} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Email negozio</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={cls} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">IVA (%)</label>
              <input type="number" min="0" max="100" step="1" value={vatRate} onChange={(e) => setVatRate(e.target.value)} className={cls} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Valuta</label>
              <input value="EUR (€)" disabled className={cls + ' bg-ivory text-soft-black/60'} />
            </div>
          </div>
          <div className="bg-ivory border border-pearl-grey/60 p-3 text-xs text-soft-grey">
            P.IVA: IT03786790133 · Sede: Via Giuseppe Verdi 2/B, 22072 Cermenate (CO)
          </div>
          {msg && (
            <p className={`text-xs px-3 py-2 ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Salva negozio'}
          </button>
        </form>
      )}
    </Section>
  );
}

function EmailSection() {
  return (
    <Section icon={Mail} title="Email">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Provider</label>
          <input value="Resend" disabled className={cls + ' bg-ivory text-soft-black/60'} />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Dominio</label>
          <input value="silkincom.com" disabled className={cls + ' bg-ivory text-soft-black/60'} />
        </div>
      </div>
      <div className="space-y-1 text-xs text-soft-grey">
        <p><strong>Email attive:</strong></p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>Conferma ordine</li>
          <li>Spedizione con tracking</li>
          <li>Welcome newsletter</li>
          <li>Heritage story (giorno 3)</li>
          <li>Sconto primo acquisto (giorno 7)</li>
          <li>Carrello abbandonato (24h)</li>
          <li>Richiesta recensione (14gg post-consegna)</li>
        </ul>
      </div>
    </Section>
  );
}

const cls = 'w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black';

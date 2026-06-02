'use client';

import { useState } from 'react';
import { Mail, Loader2, Check } from 'lucide-react';

export function ResendConfirmationButton({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/resend-confirmation`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.ok) setMsg({ ok: true, text: `Inviata a ${data.to}` });
      else setMsg({ ok: false, text: data.error || 'Errore invio' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-pearl-grey bg-white p-6">
      <h2 className="font-medium mb-3 text-sm">Email conferma</h2>
      <button
        onClick={send}
        disabled={busy}
        className="inline-flex items-center gap-2 px-5 py-2 border border-soft-black/30 text-[10px] uppercase tracking-[0.2em] hover:bg-soft-black hover:text-warm-white transition-colors disabled:opacity-40"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
        Reinvia conferma al cliente
      </button>
      {msg && (
        <p className={`mt-3 text-xs flex items-center gap-1.5 ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>
          {msg.ok && <Check className="w-3.5 h-3.5" />}{msg.text}
        </p>
      )}
    </div>
  );
}

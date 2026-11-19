"use client";

import { useCallback, useEffect, useState } from "react";

type Quote = {
  total: number; deposit: number; expiry: string | null;
  inclusions: string[]; exclusions: string[];
  conditions: string; payment: string; legacyLink: string;
  accepted: boolean; depositPaid: boolean; balancePaid: boolean; canPay: boolean;
};

const euros = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export function SharedExperienceQuote() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const perform = useCallback(async (action: "view" | "accept" | "pay" | "pdf", key: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/experience/booking", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, token: key }),
      });
      if (action === "pdf" && response.ok) {
        const blob = await response.blob();
        if (blob.type !== "application/pdf") throw new Error("Il PDF non è disponibile.");
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "SILKinCOM-Preventivo-Experience.pdf";
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (action === "pay") {
        sessionStorage.setItem("experience-quote-return", key);
        location.assign(data.url);
      } else {
        setQuote(data);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Preventivo non disponibile.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const addressToken = location.hash.slice(1);
    const key = addressToken || sessionStorage.getItem("experience-quote-return") || "";
    sessionStorage.removeItem("experience-quote-return");
    if (!/^[a-f0-9]{64}$/.test(key)) {
      setError("Apri il link privato ricevuto da SILKinCOM.");
      setBusy(false);
      return;
    }
    if (!addressToken) history.replaceState(null, "", `#${key}`);
    setToken(key);
    void perform("view", key);
  }, [perform]);

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-5 py-12">
      <h1 className="font-display text-4xl">Il suo preventivo Experience</h1>
      {error && <p role="alert" className="bg-red-50 p-3 text-red-900">{error}</p>}
      {busy && <p role="status">Aggiornamento in corso…</p>}
      {quote && (
        <article className="space-y-4 border border-pearl-grey bg-white p-5">
          <p className="text-xl font-semibold">Totale {euros.format(quote.total / 100)}</p>
          {quote.expiry && <p>Validità della proposta fino al {new Date(quote.expiry).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}</p>}
          {[[ "Incluso", quote.inclusions ], [ "Escluso", quote.exclusions ]].map(([label, rows]) => (
            Array.isArray(rows) && rows.length > 0 && <section key={String(label)}>
              <h2 className="font-semibold">{label}</h2>
              <ul className="list-inside list-disc">{rows.map((row) => <li key={row}>{row}</li>)}</ul>
            </section>
          ))}
          <p className="whitespace-pre-wrap">{quote.conditions}</p>
          {quote.payment && <p className="whitespace-pre-wrap">{quote.payment}</p>}
          <p className="bg-warm-white p-3" role="status">{quote.balancePaid ? "Pagamento completato."
            : quote.depositPaid ? "Acconto registrato. Saldo da versare."
              : quote.accepted ? "Preventivo accettato. Acconto da versare." : "In attesa della sua accettazione."}</p>
          {!quote.accepted && <button className="bg-soft-black px-4 py-3 text-white" disabled={busy} onClick={() => void perform("accept", token)}>
            Accetto il preventivo e le condizioni
          </button>}
          {quote.legacyLink && <a href={quote.legacyLink} className="inline-block bg-soft-black px-4 py-3 text-white">Versa l’acconto con il link concordato</a>}
          {quote.canPay && <button className="bg-soft-black px-4 py-3 text-white" disabled={busy} onClick={() => void perform("pay", token)}>
            {quote.depositPaid ? "Paga il saldo con carta" : "Versa l’acconto con carta"}
          </button>}
          {quote.accepted && !quote.balancePaid && <button className="ml-2 border px-4 py-3" disabled={busy} onClick={() => void perform("view", token)}>Aggiorna lo stato</button>}
          <div className="border-t border-pearl-grey pt-4">
            <button type="button" className="min-h-12 border border-soft-black px-4 py-3 font-medium" disabled={busy} onClick={() => void perform("pdf", token)}>
              Scarica PDF del preventivo
            </button>
          </div>
        </article>
      )}
    </main>
  );
}

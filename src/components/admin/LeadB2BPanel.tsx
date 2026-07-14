"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Send,
  ExternalLink,
  Trash2,
  Plus,
  RefreshCw,
  Mail,
  Building2,
  Globe,
  ShieldCheck,
  MapPin,
} from "lucide-react";

type Lead = {
  id: string;
  company_name: string;
  website_url: string;
  industry: string;
  city: string | null;
  country: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source_url: string | null;
  public_contact_page: string | null;
  discovery_query: string | null;
  notes: string | null;
  status: string;
  score: number;
  do_not_contact: boolean;
  last_scanned_at: string | null;
  last_contacted_at: string | null;
  last_reply_at: string | null;
  stop_requested_at: string | null;
  last_reply_excerpt: string | null;
  reply_count: number | null;
  email_sent_count: number | null;
  created_at: string;
};

type LeadReply = {
  id: string;
  from_email: string;
  subject: string | null;
  message_excerpt: string | null;
  intent: "reply" | "stop" | "bounce" | "unknown";
  received_at: string;
  lead_accounts?: { company_name?: string | null } | null;
};

const STATUS_LABELS: Record<string, string> = {
  new: "Nuovo",
  scanned: "Scansionato",
  qualified: "Qualificato",
  contacted: "Contattato",
  replied: "Risposto",
  do_not_contact: "Do not contact",
};

const STATUS_BADGES: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  scanned: "bg-amber-100 text-amber-800",
  qualified: "bg-emerald-100 text-emerald-800",
  contacted: "bg-violet-100 text-violet-800",
  replied: "bg-green-100 text-green-800",
  do_not_contact: "bg-red-100 text-red-700",
};

const FOCUS_OPTIONS = [
  { value: "hospitality", label: "Hotel / Hospitality" },
  { value: "bed_breakfast", label: "B&B / Relais charme" },
  { value: "hotel_boutique", label: "Boutique hotel / Resort shop" },
  { value: "resort_beach_club", label: "Beach club / Resort" },
  { value: "spa_wellness", label: "Spa / Wellness" },
  { value: "wedding_events", label: "Wedding / Eventi" },
  { value: "corporate_gifting", label: "Corporate gifting" },
  { value: "concept_store", label: "Concept store" },
  { value: "museum_bookshop", label: "Museum shop / Cultura" },
  { value: "yacht_golf_club", label: "Yacht / Golf club" },
  { value: "personal_shopper", label: "Personal shopper" },
  { value: "interior_architect", label: "Interior / Architetti" },
  { value: "tour_operator_luxury", label: "Luxury travel" },
  { value: "retail", label: "Boutique retail" },
  { value: "gifting", label: "Gift e amenities" },
  { value: "wholesale", label: "Wholesale / B2B" },
];

const SALES_OUTLET_GUIDE = [
  "B&B charme, relais, boutique hotel e concierge",
  "Spa, wellness club e medical spa premium",
  "Beach club, yacht club e golf club",
  "Wedding planner, eventi e venue di fascia alta",
  "Concept store, boutique multimarca e department store",
  "Corporate gifting per HR, board e clienti VIP",
  "Museum shop, bookshop e fondazioni culturali",
  "Luxury travel advisor, DMC e personal shopper",
];

export function LeadB2BPanel({
  initialLeads,
  initialReplies,
}: {
  initialLeads: Lead[];
  initialReplies: LeadReply[];
}) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [replies, setReplies] = useState<LeadReply[]>(initialReplies);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [liveQuery, setLiveQuery] = useState(
    "b&b charme relais hotel boutique resort shop spa luxury concept store",
  );
  const [liveLocation, setLiveLocation] = useState("Lago di Como Italia");
  const [liveMaxResults, setLiveMaxResults] = useState("6");
  const [scanUrls, setScanUrls] = useState("");
  const [scanNotes, setScanNotes] = useState("");
  const [scanIndustry, setScanIndustry] = useState("hospitality");
  const [manual, setManual] = useState({
    company_name: "",
    website_url: "",
    industry: "hospitality",
    city: "",
    country: "IT",
    contact_name: "",
    contact_role: "",
    contact_email: "",
    contact_phone: "",
    source_url: "",
    public_contact_page: "",
    notes: "",
  });
  const [focus, setFocus] = useState("hospitality");
  const [campaignNotes, setCampaignNotes] = useState(
    "Se desidera, possiamo inviare una proposta riservata con selezione prodotto e condizioni dedicate.",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const stats = useMemo(() => {
    const qualified = leads.filter(
      (lead) => lead.status === "qualified",
    ).length;
    const contacted = leads.filter(
      (lead) => lead.status === "contacted",
    ).length;
    const withEmail = leads.filter((lead) =>
      Boolean(lead.contact_email),
    ).length;
    const replied = leads.filter((lead) => Boolean(lead.last_reply_at)).length;
    const stopped = leads.filter(
      (lead) => Boolean(lead.stop_requested_at) || lead.do_not_contact,
    ).length;
    return {
      total: leads.length,
      qualified,
      contacted,
      withEmail,
      replied,
      stopped,
    };
  }, [leads]);

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  useEffect(() => {
    setReplies(initialReplies);
  }, [initialReplies]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function selectVisible(withEmailsOnly = false) {
    setSelectedIds(
      leads
        .filter((lead) => (withEmailsOnly ? Boolean(lead.contact_email) : true))
        .map((lead) => lead.id),
    );
  }

  async function refresh() {
    router.refresh();
  }

  async function runLiveSearch() {
    if (!liveQuery.trim()) {
      setMessage(
        'Inserisci una ricerca, ad esempio "hotel lusso Lago di Como".',
      );
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: liveQuery,
          location: liveLocation,
          industry: scanIndustry,
          notes: scanNotes,
          maxResults: Number(liveMaxResults) || 6,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ricerca live fallita");
      const provider =
        data.provider === "duckduckgo" ? "motore pubblico" : "Google";
      const warningText = data.warnings?.length
        ? ` ${data.warnings.length} siti non leggibili.`
        : "";
      setMessage(
        `Ricerca completata via ${provider}: ${data.saved || 0} lead salvati da ${data.candidates || 0} risultati.${warningText}`,
      );
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Errore ricerca live",
      );
    } finally {
      setBusy(false);
    }
  }

  async function runDiscovery() {
    const urls = scanUrls
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      setMessage("Inserisci almeno un dominio o URL pubblico.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/leads/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls,
          industry: scanIndustry,
          notes: scanNotes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Discovery fallita");
      const warningText = data.warnings?.length
        ? ` ${data.warnings.length} siti non leggibili.`
        : "";
      setMessage(
        `Scansione completata: ${data.discovered || 0} lead aggiornati.${warningText}`,
      );
      setScanUrls("");
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Errore di scansione",
      );
    } finally {
      setBusy(false);
    }
  }

  async function addManualLead() {
    if (!manual.company_name.trim() || !manual.website_url.trim()) {
      setMessage("Servono nome azienda e sito web.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(manual).map(([key, value]) => [
          key,
          typeof value === "string" && !value.trim() ? undefined : value,
        ]),
      );
      const response = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Lead non salvato");
      setMessage(
        `Lead salvato: ${data.lead?.company_name || manual.company_name}`,
      );
      setManual({
        company_name: "",
        website_url: "",
        industry: "hospitality",
        city: "",
        country: "IT",
        contact_name: "",
        contact_role: "",
        contact_email: "",
        contact_phone: "",
        source_url: "",
        public_contact_page: "",
        notes: "",
      });
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Errore salvataggio lead",
      );
    } finally {
      setBusy(false);
    }
  }

  async function patchLead(id: string, patch: Record<string, unknown>) {
    setMessage(null);
    const response = await fetch(`/api/admin/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Aggiornamento fallito");
    setLeads((prev) => prev.map((lead) => (lead.id === id ? data.lead : lead)));
  }

  async function deleteLead(id: string, name: string) {
    if (!confirm(`Eliminare il lead "${name}"?`)) return;
    const response = await fetch(`/api/admin/leads/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Cancellazione fallita");
      return;
    }
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    await refresh();
  }

  async function sendOutreach(overrideIds?: string[]) {
    const ids = overrideIds?.length ? overrideIds : selectedIds;
    if (ids.length === 0) {
      setMessage("Seleziona almeno un lead.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/leads/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: ids, focus, notes: campaignNotes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invio fallito");
      const sent = (data.results || []).filter((item: any) => item.ok).length;
      const failed = (data.results || []).filter(
        (item: any) => !item.ok,
      ).length;
      setMessage(
        `Invio completato: ${sent} inviati${failed ? `, ${failed} saltati` : ""}.`,
      );
      setSelectedIds([]);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Errore invio email");
    } finally {
      setBusy(false);
    }
  }

  const selectedLeads = leads.filter((lead) => selectedIds.includes(lead.id));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
      <div className="space-y-6">
        {message && (
          <section
            className="border border-gold-primary/50 bg-ivory px-5 py-4 text-sm leading-relaxed"
            role="status"
            aria-live="polite"
          >
            {message}
          </section>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <Stat label="Lead totali" value={stats.total} />
          <Stat label="Con email" value={stats.withEmail} />
          <Stat label="Qualificati" value={stats.qualified} />
          <Stat label="Contattati" value={stats.contacted} />
          <Stat label="Risposte" value={stats.replied} />
          <Stat label="Stop" value={stats.stopped} />
        </section>

        <section className="border border-pearl-grey bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-medium text-lg flex items-center gap-2">
                <Search className="w-4 h-4 text-gold-primary" />
                Ricerca live contatti
              </h2>
              <p className="text-sm text-soft-grey">
                Cerca aziende reali online e crea lead con sito, pagina contatti
                ed email pubblica quando disponibile.
              </p>
            </div>
            <button
              type="button"
              onClick={runLiveSearch}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 bg-soft-black text-warm-white text-sm disabled:opacity-60"
            >
              <Search className="w-4 h-4" />
              Trova e scansiona
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_140px] gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                Query
              </label>
              <div className="flex items-center gap-2 border border-pearl-grey bg-warm-white px-3 py-3">
                <Search className="w-4 h-4 text-soft-grey flex-shrink-0" />
                <input
                  value={liveQuery}
                  onChange={(e) => setLiveQuery(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-none"
                  placeholder="hotel lusso, spa resort, boutique hotel..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                Zona
              </label>
              <div className="flex items-center gap-2 border border-pearl-grey bg-warm-white px-3 py-3">
                <MapPin className="w-4 h-4 text-soft-grey flex-shrink-0" />
                <input
                  value={liveLocation}
                  onChange={(e) => setLiveLocation(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-none"
                  placeholder="Como, Milano, Svizzera..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                Risultati
              </label>
              <select
                value={liveMaxResults}
                onChange={(e) => setLiveMaxResults(e.target.value)}
                className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black"
              >
                <option value="3">3</option>
                <option value="6">6</option>
                <option value="10">10</option>
              </select>
            </div>
          </div>
        </section>

        <section className="border border-pearl-grey bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-medium text-lg flex items-center gap-2">
                <Search className="w-4 h-4 text-gold-primary" />
                Scansione siti pubblici
              </h2>
              <p className="text-sm text-soft-grey">
                Inserisci domini hotel, pagine contatti o altri siti business
                pubblici.
              </p>
            </div>
            <button
              type="button"
              onClick={runDiscovery}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 bg-soft-black text-warm-white text-sm disabled:opacity-60"
            >
              <RefreshCw className="w-4 h-4" />
              Scansiona
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                URL da scansionare
              </label>
              <textarea
                value={scanUrls}
                onChange={(e) => setScanUrls(e.target.value)}
                rows={4}
                placeholder="https://hotel-example.com\nhttps://another-hotel.com"
                className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black resize-y"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                Settore
              </label>
              <select
                value={scanIndustry}
                onChange={(e) => setScanIndustry(e.target.value)}
                className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black"
              >
                {FOCUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                Note discovery
              </label>
              <input
                value={scanNotes}
                onChange={(e) => setScanNotes(e.target.value)}
                className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black"
                placeholder="es. focus Lago di Como, hospitality, boutique hotel"
              />
            </div>
          </div>
        </section>

        <section className="border border-pearl-grey bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-medium text-lg flex items-center gap-2">
                <Plus className="w-4 h-4 text-gold-primary" />
                Aggiungi lead manuale
              </h2>
              <p className="text-sm text-soft-grey">
                Per importazioni rapide o contatti già verificati.
              </p>
            </div>
            <button
              type="button"
              onClick={addManualLead}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 border border-soft-black text-sm disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              Salva lead
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Azienda"
              value={manual.company_name}
              onChange={(company_name) =>
                setManual((prev) => ({ ...prev, company_name }))
              }
            />
            <Field
              label="Sito web"
              value={manual.website_url}
              onChange={(website_url) =>
                setManual((prev) => ({ ...prev, website_url }))
              }
            />
            <Field
              label="Città"
              value={manual.city}
              onChange={(city) => setManual((prev) => ({ ...prev, city }))}
            />
            <Field
              label="Paese"
              value={manual.country}
              onChange={(country) =>
                setManual((prev) => ({ ...prev, country }))
              }
            />
            <Field
              label="Email contatto"
              value={manual.contact_email}
              onChange={(contact_email) =>
                setManual((prev) => ({ ...prev, contact_email }))
              }
            />
            <Field
              label="Ruolo"
              value={manual.contact_role}
              onChange={(contact_role) =>
                setManual((prev) => ({ ...prev, contact_role }))
              }
            />
            <Field
              label="Nome contatto"
              value={manual.contact_name}
              onChange={(contact_name) =>
                setManual((prev) => ({ ...prev, contact_name }))
              }
            />
            <Field
              label="Telefono"
              value={manual.contact_phone}
              onChange={(contact_phone) =>
                setManual((prev) => ({ ...prev, contact_phone }))
              }
            />
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                Settore
              </label>
              <select
                value={manual.industry}
                onChange={(e) =>
                  setManual((prev) => ({ ...prev, industry: e.target.value }))
                }
                className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black"
              >
                {FOCUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Fonte"
              value={manual.source_url}
              onChange={(source_url) =>
                setManual((prev) => ({ ...prev, source_url }))
              }
            />
            <Field
              label="Pagina contatti"
              value={manual.public_contact_page}
              onChange={(public_contact_page) =>
                setManual((prev) => ({ ...prev, public_contact_page }))
              }
            />
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                Note
              </label>
              <textarea
                value={manual.notes}
                onChange={(e) =>
                  setManual((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black resize-y"
                placeholder="Osservazioni interne, contesto della struttura, priorità"
              />
            </div>
          </div>
        </section>

        <section className="border border-pearl-grey bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-pearl-grey flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium text-lg">Lead pubblici</h2>
              <p className="text-sm text-soft-grey">
                {leads.length} record salvati
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => selectVisible(false)}
                className="px-3 py-2 text-sm border border-pearl-grey"
              >
                Seleziona tutti
              </button>
              <button
                type="button"
                onClick={() => selectVisible(true)}
                className="px-3 py-2 text-sm border border-pearl-grey"
              >
                Solo con email
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-2 text-sm border border-pearl-grey"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-warm-white border-b border-pearl-grey">
                <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Contatto</th>
                  <th className="px-4 py-3">Stato</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pearl-grey/60">
                {leads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-soft-grey"
                    >
                      Nessun lead ancora. Inserisci i primi domini da
                      scansionare.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={
                        selectedIds.includes(lead.id) ? "bg-ivory/60" : ""
                      }
                    >
                      <td className="px-4 py-4 align-top">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => toggleSelected(lead.id)}
                          className="h-4 w-4 accent-black"
                        />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gold-primary" />
                            <p className="font-medium">{lead.company_name}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-soft-grey">
                            <Globe className="w-3.5 h-3.5" />
                            <a
                              href={lead.website_url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-gold-primary truncate max-w-[240px]"
                            >
                              {lead.website_url}
                            </a>
                          </div>
                          {lead.notes && (
                            <p className="text-xs text-soft-grey max-w-[420px] line-clamp-2">
                              {lead.notes}
                            </p>
                          )}
                          {lead.last_reply_excerpt && (
                            <p className="text-xs text-soft-black/70 max-w-[420px] line-clamp-2">
                              Risposta: {lead.last_reply_excerpt}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-soft-grey" />
                            <span>{lead.contact_email || "—"}</span>
                          </div>
                          <div>
                            {lead.contact_name || "—"}{" "}
                            {lead.contact_role ? `· ${lead.contact_role}` : ""}
                          </div>
                          <div>
                            {[lead.city, lead.country]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </div>
                          {lead.public_contact_page && (
                            <a
                              href={lead.public_contact_page}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-gold-primary hover:underline"
                            >
                              Pagina contatti{" "}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-2">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] rounded ${STATUS_BADGES[lead.status] || "bg-pearl-grey text-soft-grey"}`}
                          >
                            {STATUS_LABELS[lead.status] || lead.status}
                          </span>
                          <select
                            value={lead.status}
                            onChange={(e) =>
                              patchLead(lead.id, { status: e.target.value })
                            }
                            className="block w-full border border-pearl-grey px-2 py-1 text-xs bg-white focus:outline-none focus:border-soft-black"
                          >
                            {Object.keys(STATUS_LABELS).map((status) => (
                              <option key={status} value={status}>
                                {STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-sm">
                        <div className="space-y-1">
                          <p className="font-medium">{lead.score ?? 0}</p>
                          <p className="text-xs text-soft-grey">
                            Email: {lead.email_sent_count ?? 0}
                          </p>
                          <p className="text-xs text-soft-grey">
                            Risposte: {lead.reply_count ?? 0}
                          </p>
                          <p className="text-xs text-soft-grey">
                            {lead.do_not_contact ? "Bloccato" : "OK"}
                          </p>
                          {lead.stop_requested_at && (
                            <p className="text-xs text-red-700">
                              STOP{" "}
                              {new Date(
                                lead.stop_requested_at,
                              ).toLocaleDateString("it-IT")}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => sendOutreach([lead.id])}
                            disabled={busy}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-soft-black text-warm-white text-xs disabled:opacity-50"
                            title="Invia outreach ai lead selezionati"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Invia
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              deleteLead(lead.id, lead.company_name)
                            }
                            className="inline-flex items-center gap-2 px-3 py-2 border border-red-200 text-red-700 text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Elimina
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              patchLead(lead.id, {
                                do_not_contact: !lead.do_not_contact,
                                status: lead.do_not_contact
                                  ? "qualified"
                                  : "do_not_contact",
                              })
                            }
                            className="inline-flex items-center gap-2 px-3 py-2 border border-pearl-grey text-xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {lead.do_not_contact ? "Riattiva" : "Blocca"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="border border-pearl-grey bg-white p-5">
          <h2 className="font-medium text-lg mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-gold-primary" />
            Campagna email
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                Focus offerta
              </label>
              <select
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black"
              >
                {FOCUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                Nota campagna
              </label>
              <textarea
                value={campaignNotes}
                onChange={(e) => setCampaignNotes(e.target.value)}
                rows={5}
                className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black resize-y"
              />
            </div>
            <button
              type="button"
              onClick={() => sendOutreach()}
              disabled={busy || selectedIds.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gold-primary text-soft-black text-sm font-medium disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Invia a {selectedIds.length} lead
            </button>
            <p className="text-[11px] text-soft-grey leading-relaxed">
              Il sistema usa solo contatti business pubblici, traccia invii e
              risposte, e blocca automaticamente chi risponde “stop”.
            </p>
          </div>
        </section>

        <section className="border border-pearl-grey bg-white p-5 space-y-3">
          <h3 className="font-medium">Sbocchi 360°</h3>
          <p className="text-sm text-soft-grey leading-relaxed">
            Canali prioritari per vendere SILKinCOM fuori dal solo e-commerce.
          </p>
          <ul className="space-y-2">
            {SALES_OUTLET_GUIDE.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-soft-black/80">
                <span className="mt-2 h-px w-5 bg-gold-primary flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-pearl-grey bg-white p-5 space-y-3">
          <h3 className="font-medium">Selezionati</h3>
          {selectedLeads.length === 0 ? (
            <p className="text-sm text-soft-grey">Nessun lead selezionato.</p>
          ) : (
            <ul className="space-y-2">
              {selectedLeads.map((lead) => (
                <li
                  key={lead.id}
                  className="text-sm border-b border-pearl-grey/60 pb-2 last:border-0 last:pb-0"
                >
                  <p className="font-medium">{lead.company_name}</p>
                  <p className="text-xs text-soft-grey">
                    {lead.contact_email || "email mancante"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-pearl-grey bg-white p-5 space-y-3">
          <h3 className="font-medium">Risposte recenti</h3>
          {replies.length === 0 ? (
            <p className="text-sm text-soft-grey">
              Nessuna risposta tracciata.
            </p>
          ) : (
            <ul className="space-y-3">
              {replies.map((reply) => (
                <li
                  key={reply.id}
                  className="border-b border-pearl-grey/60 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="text-sm font-medium truncate">
                      {reply.lead_accounts?.company_name || reply.from_email}
                    </p>
                    <span
                      className={`text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 ${reply.intent === "stop" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                    >
                      {reply.intent}
                    </span>
                  </div>
                  <p className="text-xs text-soft-grey truncate">
                    {reply.subject || reply.from_email}
                  </p>
                  {reply.message_excerpt && (
                    <p className="text-xs text-soft-black/70 line-clamp-2 mt-1">
                      {reply.message_excerpt}
                    </p>
                  )}
                  <p className="text-[10px] text-soft-grey mt-1">
                    {new Date(reply.received_at).toLocaleString("it-IT")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-pearl-grey bg-white p-5 space-y-3">
          <h3 className="font-medium">Stato operativo</h3>
          <div className="space-y-2 text-sm text-soft-grey leading-relaxed">
            <p>1. Scansiona siti pubblici o importa lead verificati.</p>
            <p>2. Qualifica il contatto prima dell’invio.</p>
            <p>3. Invia una proposta premium, tracciata in admin.</p>
            <p>4. Blocca sempre i contatti che chiedono stop.</p>
            <p>5. Le risposte inbound aggiornano stato, traccia e opt-out.</p>
          </div>
        </section>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-pearl-grey bg-white p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">
        {label}
      </p>
      <p className="font-display text-3xl">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black"
      />
    </div>
  );
}

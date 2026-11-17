"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import { Plus, RefreshCw, ArrowLeft, Compass, X } from "lucide-react";
import {
  resourceSchemas,
  experienceLabels,
  internalLakes,
  supplierStatuses,
  requestStatuses,
  supplierInput,
  serviceInput,
  quoteInput,
  quoteTotals,
  type Resource,
  type Supplier,
  type Service,
  type AdminTrip,
  type AdminRequest,
  type AdminQuote,
  type QuoteItem,
} from "@/lib/experience-admin";
const tabs = {
  requests: "Richieste",
  trips: "Viaggi e preventivi",
  services: "Listino interno",
  suppliers: "Fornitori",
};
const cls =
  "w-full min-h-12 rounded-sm border border-pearl-grey bg-white px-3 py-2 text-base focus:border-gold-dark focus:outline focus:outline-2 focus:outline-gold-dark/40";
const button =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-soft-black/25 px-4 py-3 text-sm font-medium disabled:opacity-50 hover:border-gold-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-dark";
const primary = button + " bg-soft-black text-white hover:bg-soft-black/85";
const money = (value: number | null) =>
  value === null
    ? "Da definire"
    : new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
      }).format(value / 100);
const date = (value: string) =>
  new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
const fromEuro = (value: string) => {
  if (!value.trim()) return null;
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) ? Math.round(amount * 100) : NaN;
};
const toEuro = (value: number | null) =>
  value === null ? "" : String(value / 100);
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0 space-y-2 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-900"
    >
      {children}
    </p>
  );
}
function lines(value: string) {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
async function apiSave(payload: unknown) {
  const response = await fetch("/api/admin/experience", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Salvataggio non riuscito.");
  return z.object({ ok: z.literal(true), id: z.string().uuid() }).parse(data);
}
export function ExperienceManager() {
  const [tab, setTab] = useState<Resource>("requests");
  const [rows, setRows] = useState<unknown[]>([]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Supplier | Service | "new" | null>(
    null,
  );
  const [trip, setTrip] = useState<AdminTrip | null>(null);
  const [quote, setQuote] = useState<AdminQuote | "new" | null>(null);
  const [tripFilter, setTripFilter] = useState("");
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          resource: tab,
          page: String(page),
          search: query,
        });
        if (tab === "trips" && tripFilter) params.set("trip", tripFilter);
        const response = await fetch(`/api/admin/experience?${params}`, {
          cache: "no-store",
          signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Caricamento non riuscito.");
        const parsed = z
          .object({
            rows: z.array(resourceSchemas[tab]),
            total: z.number().int().nonnegative(),
            page: z.number().int(),
          })
          .parse(data);
        setRows(parsed.rows);
        setTotal(parsed.total);
      } catch (cause) {
        if (signal?.aborted) return;
        console.error("[experience-admin] Load failed:", cause);
        setRows([]);
        setError(
          cause instanceof Error ? cause.message : "Caricamento non riuscito.",
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [tab, page, query, tripFilter],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  function changeTab(next: Resource) {
    setTab(next);
    setPage(0);
    setQuery("");
    setSearch("");
    setEditing(null);
    setTrip(null);
    setQuote(null);
    setTripFilter("");
    setNotice("");
  }
  async function status(request: AdminRequest, next: string) {
    setError("");
    try {
      await apiSave({
        action: "request_status",
        id: request.id,
        updated_at: request.updated_at,
        status: next,
      });
      setNotice("Stato della richiesta aggiornato.");
      await load();
    } catch (cause) {
      console.error("[experience-admin] Status failed:", cause);
      setError(
        cause instanceof Error ? cause.message : "Aggiornamento non riuscito.",
      );
    }
  }
  async function saved(message = "Dati salvati.") {
    setEditing(null);
    setQuote(null);
    setTrip(null);
    setNotice(message);
    await load();
  }
  function openLinkedTrip(id: string) {
    changeTab("trips");
    setTripFilter(id);
  }
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-gold-dark">
            SILKinCOM · Gestione riservata
          </p>
          <h1 className="font-display text-4xl sm:text-5xl">Experience</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-soft-black/70">
            Richieste, programmi dei clienti, preventivi, listino e fornitori. I
            costi interni restano riservati.
          </p>
        </div>
        <Link href="/experience" className={button}>
          <Compass size={18} />
          Pagina pubblica
        </Link>
      </header>
      <nav
        aria-label="Gestione Experience"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {Object.entries(tabs).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => changeTab(key as Resource)}
            aria-current={tab === key ? "page" : undefined}
            className={`${button} ${tab === key ? "bg-soft-black text-white" : "bg-white"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {notice && (
        <p
          role="status"
          className="border border-green-200 bg-green-50 p-4 text-sm text-green-900"
        >
          {notice}
        </p>
      )}
      {error && <Alert>{error}</Alert>}
      {editing && (tab === "suppliers" || tab === "services") ? (
        <InternalEditor
          resource={tab}
          record={editing}
          onCancel={() => setEditing(null)}
          onSaved={saved}
        />
      ) : trip ? (
        <section className="space-y-5">
          <button
            type="button"
            className={button}
            onClick={() => {
              setTrip(null);
              setQuote(null);
            }}
          >
            <ArrowLeft size={16} />
            Torna ai viaggi
          </button>
          <TripDetails trip={trip} />
          {quote ? (
            <QuoteEditor
              key={quote === "new" ? "new" : quote.id}
              trip={trip}
              quote={quote}
              onCancel={() => setQuote(null)}
              onSaved={saved}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-3xl">
                  Preventivi del viaggio
                </h2>
                <button className={primary} onClick={() => setQuote("new")}>
                  <Plus size={17} />
                  Nuovo preventivo
                </button>
              </div>
              <p className="text-sm leading-6 text-soft-black/70">
                Le bozze sono riservate. Solo «Pubblica nell’area cliente»
                mostra il preventivo al proprietario del viaggio, senza inviare
                messaggi.
              </p>
              {!trip.experience_quotes.length && (
                <p className="border border-pearl-grey bg-white p-6">
                  Nessun preventivo: può preparare la prima proposta.
                </p>
              )}
              {[...trip.experience_quotes]
                .sort((a, b) => b.published_at.localeCompare(a.published_at))
                .map((q) => (
                  <article
                    className="space-y-3 border border-pearl-grey bg-white p-5"
                    key={q.id}
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <h3 className="font-display text-3xl">
                        {money(q.total_cents)}
                      </h3>
                      <span className="text-sm font-medium">
                        {q.status === "sent"
                          ? "Pubblicato nell’area cliente"
                          : "Bozza riservata"}
                      </span>
                    </div>
                    <p className="text-sm">
                      {date(q.published_at)}
                      {q.valid_until
                        ? ` · Valido fino al ${date(q.valid_until)}`
                        : " · Scadenza da definire"}
                    </p>
                    {q.trip_updated_at !== trip.updated_at && (
                      <Alert>
                        Il viaggio è cambiato: questo preventivo si riferisce a
                        una versione precedente.
                      </Alert>
                    )}
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {q.conditions}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/api/admin/experience/quotes/${q.id}/pdf`}
                        className={button}
                      >
                        {q.status === "draft"
                          ? "Scarica PDF della bozza"
                          : "Scarica PDF"}
                      </a>
                      {q.status === "draft" ? (
                        <button className={button} onClick={() => setQuote(q)}>
                          Apri e modifica bozza
                        </button>
                      ) : (
                        <button
                          className={button}
                          onClick={() =>
                            setQuote({ ...q, id: "", status: "draft" })
                          }
                        >
                          Crea una nuova revisione
                        </button>
                      )}
                    </div>
                  </article>
                ))}
            </>
          )}
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setQuery(search);
                setPage(0);
              }}
              className="flex min-w-0 flex-wrap items-end gap-2"
            >
              <Field
                label={
                  tab === "requests"
                    ? "Cerchi per email"
                    : tab === "suppliers"
                      ? "Cerchi un fornitore"
                      : "Cerchi per titolo"
                }
              >
                <input
                  className={cls}
                  value={search}
                  maxLength={100}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Field>
              <button className={button}>Cerca</button>
            </form>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={button}
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCw size={16} />
                Aggiorna
              </button>
              {(tab === "suppliers" || tab === "services") && (
                <button
                  type="button"
                  className={primary}
                  onClick={() => setEditing("new")}
                >
                  <Plus size={17} />
                  {tab === "services"
                    ? "Nuova voce di listino"
                    : "Nuovo fornitore"}
                </button>
              )}
            </div>
          </div>
          {tripFilter && (
            <button className={button} onClick={() => setTripFilter("")}>
              Mostra tutti i viaggi
            </button>
          )}
          <p className="text-sm text-soft-black/65">
            {loading
              ? "Caricamento…"
              : `${total} risultati · Pagina ${page + 1}`}
          </p>
          {loading ? (
            <p role="status" className="border border-pearl-grey bg-white p-8">
              Caricamento della sezione…
            </p>
          ) : !error && rows.length === 0 ? (
            <div className="border border-pearl-grey bg-white p-8">
              <h2 className="font-display text-2xl">Nessun risultato</h2>
              <p className="mt-2 text-base text-soft-black/70">
                {query
                  ? "Modifichi la ricerca."
                  : tab === "requests"
                    ? "Qui compariranno le richieste inviate dal modulo Experience, anche senza account."
                    : tab === "trips"
                      ? "Qui compariranno i programmi salvati dai clienti registrati. Salvare un viaggio non equivale a inviare una richiesta."
                      : "Aggiunga la prima voce. Nessun costo o accordo viene impostato automaticamente."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {rows.map((value) => {
                if (tab === "requests") {
                  const r = resourceSchemas.requests.parse(value);
                  const linked = r.messaggio.match(
                    /Viaggio account verificato: ([0-9a-f-]{36})/i,
                  )?.[1];
                  return (
                    <article
                      key={r.id}
                      className="min-w-0 space-y-4 border border-pearl-grey bg-white p-5"
                    >
                      <h2 className="break-words font-display text-2xl">
                        {[r.nome, r.cognome].filter(Boolean).join(" ") ||
                          r.email}
                      </h2>
                      <p className="break-all text-sm">
                        {r.email}
                        {r.telefono ? ` · ${r.telefono}` : ""}
                      </p>
                      <p className="text-sm text-soft-black/65">
                        {date(r.created_at)}
                      </p>
                      <RequestStatus request={r} onChange={status} />
                      <details>
                        <summary className="min-h-12 cursor-pointer py-3 text-sm font-medium">
                          Leggi la richiesta
                        </summary>
                        <p className="whitespace-pre-wrap break-words text-sm leading-7">
                          {r.messaggio}
                        </p>
                      </details>
                      {linked ? (
                        <button
                          className={button}
                          onClick={() => openLinkedTrip(linked)}
                        >
                          Apri il viaggio associato
                        </button>
                      ) : (
                        <p className="text-sm leading-6 text-soft-black/70">
                          Richiesta senza viaggio account associato. Non può
                          pubblicare un preventivo nell’area personale finché il
                          cliente non salva un viaggio.
                        </p>
                      )}
                    </article>
                  );
                }
                if (tab === "trips") {
                  const t = resourceSchemas.trips.parse(value);
                  return (
                    <article
                      className="min-w-0 space-y-3 border border-pearl-grey bg-white p-5"
                      key={t.id}
                    >
                      <h2 className="font-display text-2xl">{t.title}</h2>
                      <p className="break-words text-sm">
                        {t.customer?.full_name || "Cliente registrato"} ·{" "}
                        {t.customer?.email ||
                          "Email non disponibile nel profilo"}
                      </p>
                      <p className="text-sm">
                        {t.payload.lake} ·{" "}
                        {t.payload.details?.guests ?? "Ospiti da definire"}
                      </p>
                      <p className="text-sm text-soft-black/65">
                        Aggiornato: {date(t.updated_at)} ·{" "}
                        {t.experience_quotes.length} preventivi
                      </p>
                      <button className={primary} onClick={() => setTrip(t)}>
                        Apri viaggio e preventivi
                      </button>
                    </article>
                  );
                }
                if (tab === "suppliers") {
                  const s = resourceSchemas.suppliers.parse(value);
                  return (
                    <article
                      className="space-y-3 border border-pearl-grey bg-white p-5"
                      key={s.id}
                    >
                      <h2 className="font-display text-2xl">{s.name}</h2>
                      <p className="text-sm">
                        {s.lake} · {supplierStatuses[s.status]}
                      </p>
                      <p className="break-words text-sm">
                        {[s.contact_name, s.email, s.phone]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <button className={button} onClick={() => setEditing(s)}>
                        Modifica fornitore
                      </button>
                    </article>
                  );
                }
                const s = resourceSchemas.services.parse(value);
                const margin =
                  s.cost_cents !== null && s.price_cents !== null
                    ? s.price_cents - s.cost_cents
                    : null;
                return (
                  <article
                    className="space-y-3 border border-pearl-grey bg-white p-5"
                    key={s.id}
                  >
                    <h2 className="font-display text-2xl">{s.title}</h2>
                    <p className="text-sm">
                      {experienceLabels[s.experience_id]} · {s.lake} · Per{" "}
                      {s.unit}
                    </p>
                    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt>Costo fornitore</dt>
                        <dd className="mt-1 font-medium">
                          {money(s.cost_cents)}
                        </dd>
                      </div>
                      <div>
                        <dt>Prezzo proposto</dt>
                        <dd className="mt-1 font-medium">
                          {money(s.price_cents)}
                        </dd>
                      </div>
                      <div>
                        <dt>Margine lordo</dt>
                        <dd className="mt-1 font-medium">{money(margin)}</dd>
                      </div>
                    </dl>
                    <p className="text-sm">
                      {s.active ? "Voce attiva" : "Voce non attiva"}
                    </p>
                    <button className={button} onClick={() => setEditing(s)}>
                      Modifica voce di listino
                    </button>
                  </article>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              className={button}
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Pagina precedente
            </button>
            <button
              className={button}
              disabled={(page + 1) * 30 >= total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Pagina successiva
            </button>
          </div>
        </>
      )}
    </div>
  );
}
function RequestStatus({
  request,
  onChange,
}: {
  request: AdminRequest;
  onChange: (r: AdminRequest, status: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Field label="Stato della richiesta">
      <select
        disabled={busy}
        className={cls}
        value={request.status}
        onChange={async (e) => {
          setBusy(true);
          try {
            await onChange(request, e.target.value);
          } finally {
            setBusy(false);
          }
        }}
      >
        {Object.entries(requestStatuses).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </Field>
  );
}
function TripDetails({ trip }: { trip: AdminTrip }) {
  const d = trip.payload.details;
  return (
    <article className="space-y-4 border border-pearl-grey bg-white p-5 sm:p-7">
      <h2 className="font-display text-3xl">{trip.title}</h2>
      <p className="break-words">
        {trip.customer?.full_name} · {trip.customer?.email}
      </p>
      <p>
        {trip.payload.lake}
        {d
          ? ` · ${d.guests} ospiti · ${d.arrival || "Arrivo da definire"} / ${d.departure || "Partenza da definire"}`
          : ""}
      </p>
      <ul className="flex flex-wrap gap-2">
        {trip.payload.ids.map((id) => (
          <li className="border border-pearl-grey px-3 py-2 text-sm" key={id}>
            {experienceLabels[id] || id}
          </li>
        ))}
      </ul>
      {d && (
        <dl className="grid gap-4 text-sm leading-6 sm:grid-cols-2">
          <div>
            <dt className="font-medium">Arrivo / hotel</dt>
            <dd>
              {d.arrivalPoint || "Da definire"}
              <br />
              {d.hotel || "Da definire"}
            </dd>
          </div>
          <div>
            <dt className="font-medium">Budget indicativo</dt>
            <dd>
              {d.budget
                ? money(Math.round(Number(d.budget) * 100))
                : "Da definire"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium">Richieste e tappe</dt>
            <dd className="whitespace-pre-wrap break-words">
              {d.stops.join(" → ")}
              <br />
              {d.notes || "Nessuna nota"}
            </dd>
          </div>
        </dl>
      )}
    </article>
  );
}
async function loadOptions(
  resource: "suppliers" | "services",
  signal: AbortSignal,
) {
  const rows: unknown[] = [];
  for (let page = 0; page < 40; page++) {
    const response = await fetch(
      `/api/admin/experience?resource=${resource}&page=${page}`,
      { cache: "no-store", signal },
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Elenco non disponibile.");
    const parsed = z
      .object({
        rows: z.array(resourceSchemas[resource]),
        total: z.number().int().nonnegative(),
      })
      .parse(data);
    rows.push(...parsed.rows);
    if (rows.length >= parsed.total) return rows;
  }
  throw new Error(
    "Elenco troppo esteso per questa selezione: restringere le voci attive nel listino.",
  );
}
function InternalEditor({
  resource,
  record,
  onCancel,
  onSaved,
}: {
  resource: "suppliers" | "services";
  record: Supplier | Service | "new";
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(resource === "services");
  useEffect(() => {
    if (resource !== "services") return;
    const controller = new AbortController();
    loadOptions("suppliers", controller.signal)
      .then((rows) =>
        setSuppliers(rows.map((x) => resourceSchemas.suppliers.parse(x))),
      )
      .catch((cause) => {
        if (!controller.signal.aborted) {
          console.error("[experience-admin] Suppliers failed:", cause);
          setError(
            "Impossibile caricare i fornitori. Chiuda e riapra la voce per riprovare.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setOptionsLoading(false);
      });
    return () => controller.abort();
  }, [resource]);
  const supplier =
    resource === "suppliers" && record !== "new" ? (record as Supplier) : null;
  const service =
    resource === "services" && record !== "new" ? (record as Service) : null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const fd = new FormData(event.currentTarget);
    const value = (name: string) => String(fd.get(name) || "").trim();
    const data =
      resource === "suppliers"
        ? {
            name: value("name"),
            lake: value("lake"),
            contact_name: value("contact_name"),
            email: value("email"),
            phone: value("phone"),
            website: value("website"),
            status: value("status"),
            notes: value("notes"),
          }
        : {
            experience_id: value("experience_id"),
            title: value("title"),
            supplier_id: value("supplier_id") || null,
            lake: value("lake"),
            unit: value("unit"),
            cost_cents: fromEuro(value("cost")),
            price_cents: fromEuro(value("price")),
            notes: value("notes"),
            active: fd.get("active") === "on",
          };
    const parsed = (
      resource === "suppliers" ? supplierInput : serviceInput
    ).safeParse(data);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await apiSave({
        action: resource === "suppliers" ? "supplier" : "service",
        ...(record !== "new"
          ? { id: record.id, updated_at: record.updated_at }
          : {}),
        data: parsed.data,
      });
      await onSaved();
    } catch (cause) {
      console.error("[experience-admin] Internal record failed:", cause);
      setError(
        cause instanceof Error ? cause.message : "Salvataggio non riuscito.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="space-y-6 border border-pearl-grey bg-white p-5 sm:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-3xl">
          {record === "new" ? "Nuovo inserimento" : "Modifica"} ·{" "}
          {resource === "suppliers" ? "Fornitore" : "Listino interno"}
        </h2>
        <button
          type="button"
          className={button}
          onClick={onCancel}
          aria-label="Chiudi modifica"
        >
          <X size={18} />
        </button>
      </div>
      <p className="text-sm leading-6 text-soft-black/65">
        {resource === "services"
          ? "Il listino è interno: non modifica le card o i prezzi della pagina pubblica. Importi in euro, riferiti alla stessa unità e con trattamento IVA coerente. Il margine indicato non comprende tasse e costi generali."
          : "Registri i dati effettivi del fornitore. Lo stato «Accordo confermato» va utilizzato soltanto dopo la conferma dei servizi."}
      </p>
      <div className="grid min-w-0 gap-5 sm:grid-cols-2">
        {resource === "suppliers" ? (
          <>
            <Field label="Nome fornitore *">
              <input
                name="name"
                required
                maxLength={160}
                defaultValue={supplier?.name}
                className={cls}
              />
            </Field>
            <Field label="Referente">
              <input
                name="contact_name"
                maxLength={160}
                defaultValue={supplier?.contact_name}
                className={cls}
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Esperienza di riferimento *">
              <select
                name="experience_id"
                defaultValue={
                  service?.experience_id || Object.keys(experienceLabels)[0]
                }
                className={cls}
              >
                {Object.entries(experienceLabels).map(([id, title]) => (
                  <option value={id} key={id}>
                    {title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nome della voce *">
              <input
                name="title"
                required
                maxLength={160}
                defaultValue={service?.title}
                className={cls}
              />
            </Field>
            <Field label="Fornitore">
              <select
                name="supplier_id"
                defaultValue={service?.supplier_id || ""}
                disabled={optionsLoading}
                className={cls}
              >
                <option value="">
                  {optionsLoading ? "Caricamento…" : "Da assegnare"}
                </option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.status === "inactive" ? " (non attivo)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Unità di prezzo e costo *">
              <select
                name="unit"
                defaultValue={service?.unit || "servizio"}
                className={cls}
              >
                {[
                  "persona",
                  "gruppo",
                  "barca",
                  "ora",
                  "giorno",
                  "servizio",
                ].map((unit) => (
                  <option key={unit}>{unit}</option>
                ))}
              </select>
            </Field>
            <Field label="Costo fornitore (€)">
              <input
                name="cost"
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                placeholder="Da definire"
                defaultValue={toEuro(service?.cost_cents ?? null)}
                className={cls}
              />
            </Field>
            <Field label="Prezzo proposto (€)">
              <input
                name="price"
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                placeholder="Da definire"
                defaultValue={toEuro(service?.price_cents ?? null)}
                className={cls}
              />
            </Field>
          </>
        )}
        <Field label="Territorio">
          <select
            name="lake"
            defaultValue={supplier?.lake || service?.lake || "Da definire"}
            className={cls}
          >
            {internalLakes.map((lake) => (
              <option key={lake}>{lake}</option>
            ))}
          </select>
        </Field>
        {resource === "suppliers" && (
          <>
            <Field label="Stato">
              <select
                name="status"
                defaultValue={supplier?.status || "prospect"}
                className={cls}
              >
                {Object.entries(supplierStatuses).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Email">
              <input
                name="email"
                type="email"
                maxLength={254}
                defaultValue={supplier?.email}
                className={cls}
              />
            </Field>
            <Field label="Telefono">
              <input
                name="phone"
                type="tel"
                maxLength={80}
                defaultValue={supplier?.phone}
                className={cls}
              />
            </Field>
            <Field label="Sito web (https://)">
              <input
                name="website"
                type="url"
                maxLength={500}
                defaultValue={supplier?.website}
                className={cls}
              />
            </Field>
          </>
        )}
      </div>
      <Field label="Note interne · condizioni, stagionalità e trattamento IVA">
        <textarea
          name="notes"
          maxLength={4000}
          rows={4}
          defaultValue={supplier?.notes || service?.notes}
          className={cls}
        />
      </Field>
      {resource === "services" && (
        <label className="flex min-h-12 items-center gap-3 text-base">
          <input
            type="checkbox"
            name="active"
            defaultChecked={service?.active ?? true}
            className="h-5 w-5 accent-gold-dark"
          />
          Voce attiva
        </label>
      )}
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap gap-3">
        <button disabled={busy || optionsLoading} className={primary}>
          {busy ? "Salvataggio…" : "Salva"}
        </button>
        <button
          type="button"
          className={button}
          onClick={onCancel}
          disabled={busy}
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
function localDateTime(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function QuoteEditor({
  trip,
  quote,
  onCancel,
  onSaved,
}: {
  trip: AdminTrip;
  quote: AdminQuote | "new";
  onCancel: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const existing = quote === "new" ? null : quote;
  const initial = existing?.experience_quote_details;
  const [items, setItems] = useState<QuoteItem[]>(
    initial?.items || [
      {
        label: "",
        quantity: 1,
        cost_cents: null,
        price_cents: 0,
        service_id: null,
        supplier_id: null,
      },
    ],
  );
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [inclusions, setInclusions] = useState(
    existing?.inclusions.join("\n") || "",
  );
  const [exclusions, setExclusions] = useState(
    existing?.exclusions.join("\n") || "",
  );
  const [conditions, setConditions] = useState(existing?.conditions || "");
  const [validUntil, setValidUntil] = useState(
    localDateTime(existing?.valid_until || null),
  );
  const [notes, setNotes] = useState(initial?.internal_notes || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(false);
  const totals = quoteTotals(items);
  const reviewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    loadOptions("services", controller.signal)
      .then((rows) =>
        setServices(
          rows
            .map((x) => resourceSchemas.services.parse(x))
            .filter((s) => s.active),
        ),
      )
      .catch((cause) => {
        if (!controller.signal.aborted) {
          console.error("[experience-admin] Price list failed:", cause);
          setOptionsError(
            "Listino non disponibile: può compilare le voci manualmente oppure chiudere e riprovare.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (review) reviewRef.current?.focus();
  }, [review]);
  function update(
    index: number,
    field: keyof QuoteItem,
    value: string | number | null,
  ) {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
    setReview(false);
  }
  function payload(publish: boolean) {
    return {
      action: "quote",
      data: {
        ...(existing?.id
          ? { id: existing.id, quote_version: existing.updated_at }
          : {}),
        trip_id: trip.id,
        trip_version: trip.updated_at,
        items,
        inclusions: lines(inclusions),
        exclusions: lines(exclusions),
        conditions,
        valid_until: validUntil ? new Date(validUntil).toISOString() : null,
        internal_notes: notes,
        publish,
      },
    };
  }
  async function save(publish: boolean) {
    setError("");
    let data;
    try {
      data = payload(publish);
    } catch {
      setError("Scadenza non valida.");
      return;
    }
    const parsed = quoteInput.safeParse(data.data);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await apiSave({ ...data, data: parsed.data });
      await onSaved(
        publish
          ? "Preventivo pubblicato. Il cliente lo trova in «I miei viaggi» e può scaricarlo in PDF."
          : "Bozza salvata. Puoi aprirla e scaricarne il PDF dall’elenco dei preventivi.",
      );
    } catch (cause) {
      console.error("[experience-admin] Quote failed:", cause);
      setError(
        cause instanceof Error ? cause.message : "Salvataggio non riuscito.",
      );
    } finally {
      setBusy(false);
    }
  }
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const parsed = quoteInput.safeParse(payload(true).data);
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return;
      }
      setReview(true);
    } catch {
      setError("Controlli la scadenza.");
    }
  }
  return (
    <form
      onSubmit={prepare}
      className="space-y-6 border border-pearl-grey bg-white p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-3xl">
          {existing?.id ? "Modifica bozza" : "Nuovo preventivo"}
        </h2>
        <button type="button" onClick={onCancel} className={button}>
          Chiudi
        </button>
      </div>
      <div className="grid gap-3 rounded-sm border border-pearl-grey bg-warm-white p-4 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Destinatario</p>
          <p className="mt-1 break-words text-sm">
            {trip.customer?.full_name || "Cliente registrato"}
            {trip.customer?.email && (
              <span className="block">{trip.customer.email}</span>
            )}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Viaggio</p>
          <p className="mt-1 break-words text-sm">{trip.title}</p>
          <p className="text-sm text-soft-black/70">{trip.payload.lake}</p>
        </div>
      </div>
      <ol
        aria-label="Passaggi del preventivo"
        className="grid grid-cols-2 gap-2 text-sm"
      >
        <li
          aria-current={!review ? "step" : undefined}
          className={`border border-pearl-grey p-3 ${!review ? "bg-soft-black text-white" : "bg-warm-white"}`}
        >
          1. Compila
        </li>
        <li
          aria-current={review ? "step" : undefined}
          className={`border border-pearl-grey p-3 ${review ? "bg-soft-black text-white" : "bg-warm-white"}`}
        >
          2. Rivedi e pubblica
        </li>
      </ol>
      {!review ? (
        <>
          <h3 className="font-display text-2xl">Servizi e prezzi</h3>
          <p className="text-sm leading-6 text-soft-black/75">
            Aggiungi una riga per ogni servizio. Inserisci il costo a noi e il
            prezzo cliente per unità. Il totale si aggiorna con la quantità.
          </p>
          {optionsError && <Alert>{optionsError}</Alert>}
          <Field label="Aggiunga una voce dal listino (facoltativo)">
            <select
              className={cls}
              disabled={loading || items.length >= 30}
              value=""
              onChange={(event) => {
                const service = services.find(
                  (s) => s.id === event.target.value,
                );
                if (!service) return;
                setItems((current) => [
                  ...current.filter((i) => i.label.trim() || i.price_cents > 0),
                  {
                    label: service.title,
                    quantity: 1,
                    cost_cents: service.cost_cents,
                    price_cents: service.price_cents ?? 0,
                    service_id: service.id,
                    supplier_id: service.supplier_id,
                  },
                ]);
              }}
            >
              <option value="">
                {loading
                  ? "Caricamento del listino…"
                  : "Scelga una voce da aggiungere"}
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} · {s.lake} · {money(s.price_cents)} / {s.unit}
                </option>
              ))}
            </select>
          </Field>
          <div
            role="table"
            aria-label="Voci del preventivo"
            className="overflow-hidden rounded-sm border border-pearl-grey"
          >
            <div
              role="row"
              className="sr-only xl:not-sr-only xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(0,.65fr)_repeat(2,minmax(0,1fr))_minmax(0,1fr)_3rem] xl:gap-3 xl:bg-soft-black xl:px-4 xl:py-3 xl:text-sm xl:font-medium xl:text-white"
            >
              <span role="columnheader">Servizio</span>
              <span role="columnheader">Quantità</span>
              <span role="columnheader">Costo a noi (€)</span>
              <span role="columnheader">Prezzo unitario cliente (€)</span>
              <span role="columnheader">Totale cliente</span>
              <span role="columnheader" className="sr-only">
                Azioni
              </span>
            </div>
            {items.map((item, index) => (
              <div
                role="row"
                key={index}
                className="grid min-w-0 grid-cols-2 items-center gap-3 border-b border-pearl-grey p-4 last:border-b-0 even:bg-warm-white xl:grid-cols-[minmax(0,2fr)_minmax(0,.65fr)_repeat(2,minmax(0,1fr))_minmax(0,1fr)_3rem]"
              >
                <div role="cell" className="col-span-2 min-w-0 xl:col-span-1">
                  <label className="block text-sm font-medium">
                    <span className="mb-2 block xl:sr-only">
                      Servizio {index + 1}
                    </span>
                    <input
                      required
                      maxLength={200}
                      placeholder="Es. Aperitivo in barca"
                      className={cls}
                      value={item.label}
                      onChange={(e) => update(index, "label", e.target.value)}
                    />
                  </label>
                </div>
                <div role="cell" className="min-w-0">
                  <label className="block text-sm font-medium">
                    <span className="mb-2 block xl:sr-only">Quantità</span>
                    <input
                      type="number"
                      required
                      min="1"
                      max="1000"
                      className={cls}
                      value={item.quantity}
                      onChange={(e) =>
                        update(index, "quantity", Number(e.target.value))
                      }
                    />
                  </label>
                </div>
                <div role="cell" className="min-w-0">
                  <label className="block text-sm font-medium">
                    <span className="mb-2 block xl:sr-only">
                      Costo a noi (€)
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="1000000"
                      step="0.01"
                      className={cls}
                      value={toEuro(item.cost_cents)}
                      placeholder="Facoltativo"
                      onChange={(e) =>
                        update(index, "cost_cents", fromEuro(e.target.value))
                      }
                    />
                  </label>
                </div>
                <div role="cell" className="min-w-0">
                  <label className="block text-sm font-medium">
                    <span className="mb-2 block xl:sr-only">
                      Prezzo unitario cliente (€)
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      max="1000000"
                      step="0.01"
                      className={cls}
                      value={toEuro(item.price_cents)}
                      onChange={(e) =>
                        update(
                          index,
                          "price_cents",
                          fromEuro(e.target.value) ?? 0,
                        )
                      }
                    />
                  </label>
                </div>
                <div role="cell" className="min-w-0 text-sm">
                  <span className="mb-2 block xl:sr-only">Totale cliente</span>
                  <output className="break-words text-base font-semibold tabular-nums">
                    {money(item.quantity * item.price_cents)}
                  </output>
                </div>
                <div role="cell" className="col-span-2 xl:col-span-1">
                  <button
                    type="button"
                    className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-sm border border-pearl-grey px-2 text-sm hover:border-gold-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-dark disabled:opacity-40"
                    aria-label={`Rimuovi voce ${index + 1}`}
                    disabled={items.length === 1}
                    onClick={() =>
                      setItems((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <X size={16} aria-hidden="true" />
                    <span className="xl:sr-only">Rimuovi</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            className={button}
            type="button"
            disabled={items.length >= 30}
            onClick={() =>
              setItems((current) => [
                ...current,
                {
                  label: "",
                  quantity: 1,
                  cost_cents: null,
                  price_cents: 0,
                  service_id: null,
                  supplier_id: null,
                },
              ])
            }
          >
            <Plus size={16} />
            Aggiungi voce manuale
          </button>
          <dl className="grid gap-4 rounded-sm border border-pearl-grey bg-warm-white p-4 sm:grid-cols-3 sm:p-5">
            <div>
              <dt className="text-sm">Costo totale a noi</dt>
              <dd className="font-display text-3xl">{money(totals.cost)}</dd>
            </div>
            <div>
              <dt className="text-sm">Totale cliente</dt>
              <dd className="font-display text-3xl">{money(totals.revenue)}</dd>
            </div>
            <div>
              <dt className="text-sm">Margine lordo indicativo</dt>
              <dd className="font-display text-3xl">{money(totals.margin)}</dd>
            </div>
          </dl>
          <p className="text-sm text-soft-black/65">
            Se manca un costo, il margine resta da definire. Importi da
            confrontare con trattamento IVA coerente; tasse e costi generali non
            sono sottratti.
          </p>
          <h3 className="border-t border-pearl-grey pt-5 font-display text-2xl">
            Condizioni per il cliente
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Servizi inclusi · una voce per riga">
              <textarea
                rows={5}
                maxLength={15000}
                value={inclusions}
                onChange={(e) => setInclusions(e.target.value)}
                className={cls}
              />
            </Field>
            <Field label="Extra ed esclusioni · una voce per riga">
              <textarea
                rows={5}
                maxLength={15000}
                value={exclusions}
                onChange={(e) => setExclusions(e.target.value)}
                className={cls}
              />
            </Field>
          </div>
          <Field label="Condizioni visibili al cliente *">
            <textarea
              required
              rows={5}
              maxLength={4000}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              className={cls}
            />
          </Field>
          <Field label="Valido fino al · obbligatorio per pubblicare">
            <input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className={cls}
            />
          </Field>
          <details className="rounded-sm border border-pearl-grey bg-warm-white p-4">
            <summary className="cursor-pointer py-1 font-medium">
              Note riservate all’admin
            </summary>
            <Field label="Note interne riservate">
              <textarea
                rows={3}
                maxLength={4000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={cls}
              />
            </Field>
          </details>
          {error && <Alert>{error}</Alert>}
          <p className="text-sm leading-6 text-soft-black/75">
            Salva la bozza per riprendere il lavoro più tardi. Per consegnare il
            preventivo, apri l’anteprima e conferma la pubblicazione.
          </p>
          <div className="flex flex-col gap-3 border-t border-pearl-grey pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => void save(false)}
            >
              {busy ? "Salvataggio…" : "Salva bozza riservata"}
            </button>
            <button className={primary} disabled={busy}>
              Rivedi il preventivo
            </button>
          </div>
        </>
      ) : (
        <div
          tabIndex={-1}
          ref={reviewRef}
          className="space-y-5 focus:outline-none"
        >
          <h3 className="font-display text-3xl">Anteprima per il cliente</h3>
          <div className="border border-gold-primary/40 bg-warm-white p-5">
            <p className="text-sm font-semibold">Totale del preventivo</p>
            <p className="mt-2 font-display text-5xl">
              {money(totals.revenue)}
            </p>
            <p className="mt-2 text-sm">
              Valido fino al{" "}
              {validUntil
                ? date(new Date(validUntil).toISOString())
                : "Da definire"}
            </p>
          </div>
          <section aria-labelledby="quote-review-lines">
            <h4 id="quote-review-lines" className="mb-3 font-medium">
              Dettaglio dei servizi
            </h4>
            <ul className="divide-y divide-pearl-grey border border-pearl-grey">
              {items.map((item, index) => (
                <li
                  key={index}
                  className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm text-soft-black/75">
                      {item.quantity} × {money(item.price_cents)}
                    </p>
                  </div>
                  <p className="self-center text-sm font-semibold tabular-nums">
                    {money(item.quantity * item.price_cents)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
          <div>
            <h4 className="font-medium">Servizi inclusi</h4>
            <ul className="mt-2 list-disc pl-5 text-sm leading-7">
              {lines(inclusions).map((text, index) => (
                <li key={index}>{text}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium">Extra ed esclusioni</h4>
            <ul className="mt-2 list-disc pl-5 text-sm leading-7">
              {lines(exclusions).map((text, index) => (
                <li key={index}>{text}</li>
              ))}
            </ul>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-7">{conditions}</p>
          <p className="border border-gold-primary/40 bg-warm-white p-4 text-sm leading-6">
            «Pubblica nell’area cliente» rende disponibile il preventivo e il
            PDF in «I miei viaggi» del destinatario.
          </p>
          {error && <Alert>{error}</Alert>}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => setReview(false)}
            >
              Modifica bozza
            </button>
            <button
              type="button"
              className={primary}
              disabled={busy}
              onClick={() => void save(true)}
            >
              {busy ? "Pubblicazione…" : "Pubblica nell’area cliente"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

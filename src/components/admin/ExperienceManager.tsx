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
import { Plus, RefreshCw, ArrowLeft, Compass, X, FileDown } from "lucide-react";
import {
  BOAT_PACKAGES,
  EXPERIENCES,
  EXPERIENCE_CATEGORIES,
  LOGISTICS,
} from "@/data/experience-content";
import {
  MAX_SUPPLIER_REQUESTS,
  supplierEmailInput,
  MAX_PARTNER_SERVICES,
  supplierRequestServices,
} from "@/lib/experience-supplier-request";
import {
  combineQuoteConditions,
  experienceIssuer,
  quotePaymentMethods,
  quotePaymentTerms,
  splitQuoteConditions,
  stripeQuoteUrl,
  type QuotePaymentMethod,
} from "@/lib/experience-payment";
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
  contactIdSchema,
  customExperienceService,
  type Resource,
  type Supplier,
  type Service,
  type AdminTrip,
  type AdminRequest,
  type AdminQuote,
  type QuoteItem,
} from "@/lib/experience-admin";
const tabs = {
  requests: "Pratiche Experience",
  services: "Listino interno",
  suppliers: "Fornitori",
};
const cls =
  "w-full min-h-12 rounded-sm border border-pearl-grey bg-white px-3 py-2 text-base focus:border-gold-dark focus:outline focus:outline-2 focus:outline-gold-dark/40";
const button =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-soft-black/25 px-4 py-3 text-sm font-medium disabled:opacity-50 hover:border-gold-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-dark";
const primary = button + " bg-soft-black text-white hover:bg-soft-black/85";
const confirmAction = button + " bg-[#E6C66D] text-[#241A07] hover:bg-[#F1D993]";
const supplierAction = button + " bg-[#203B4A] text-white hover:bg-[#2D5062]";
const successNotice = "rounded-sm border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950";
const infoNotice = "rounded-sm border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950";
const checkNotice = "rounded-sm border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950";
const catalogGroups = [
  { id: "boat", label: "Formule in barca" },
  ...EXPERIENCE_CATEGORIES.filter(({ id }) => id !== "selection"),
  { id: "logistics", label: "Trasferimenti e soggiorno" },
];
type ServiceTemplate = {
  key: string;
  experienceId: string;
  group: string;
  title: string;
  description: string;
  lake: Service["lake"];
  unit: Service["unit"];
};
const serviceCatalog: ServiceTemplate[] = [
  ...BOAT_PACKAGES.map(
    (item): ServiceTemplate => ({
      key: `boat:${item.id}`,
      experienceId: `boat:${item.id}`,
      group: "boat",
      title: item.title,
      description: item.summary,
      lake: "Entrambi",
      unit: "barca",
    }),
  ),
  ...EXPERIENCES.map(
    (item): ServiceTemplate => ({
      key: `activity:${item.id}`,
      experienceId: `activity:${item.id}`,
      group: item.category,
      title: item.title,
      description: item.summary,
      lake:
        item.id === "milano"
          ? "Milano"
          : item.lakes.length > 1
            ? "Entrambi"
            : item.lakes[0] === "como"
              ? "Como"
              : "Maggiore",
      unit: item.id === "boat" ? "barca" : "servizio",
    }),
  ),
  ...LOGISTICS.map(
    (item): ServiceTemplate => ({
      key: `service:${item.id}`,
      experienceId: `service:${item.id}`,
      group: "logistics",
      title: item.title,
      description: item.summary,
      lake: "Da definire",
      unit: "servizio",
    }),
  ),
  {
    key: "transfer:shuttle",
    experienceId: customExperienceService,
    group: "logistics",
    title: "Navetta hotel ↔ pontile",
    description:
      "Trasferimento di andata e ritorno, con hotel e pontile da indicare nella voce del preventivo.",
    lake: "Da definire",
    unit: "servizio",
  },
];
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
  return z.object({ ok: z.literal(true), id: contactIdSchema }).parse(data);
}
export function ExperienceManager() {
  const [tab, setTab] = useState<Resource>("requests");
  const [loaded, setLoaded] = useState<{
    resource: Resource;
    rows: unknown[];
    total: number;
  } | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatingService, setUpdatingService] = useState<string | null>(null);
  const [editing, setEditing] = useState<Supplier | Service | "new" | null>(
    null,
  );
  const [serviceTemplate, setServiceTemplate] =
    useState<ServiceTemplate | null>(null);
  const [trip, setTrip] = useState<AdminTrip | null>(null);
  const [quote, setQuote] = useState<AdminQuote | "new" | null>(null);
  const [tripFilter, setTripFilter] = useState("");
  const [requestFilter, setRequestFilter] = useState("");
  const [recordsView, setRecordsView] = useState<"list" | "cards">("list");
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const loadSequence = useRef(0);
  const pendingOpen = useRef("");
  const current = loaded?.resource === tab ? loaded : null;
  const rows = current?.rows ?? [];
  const total = current?.total ?? 0;
  const sectionLoading = loading || (loaded !== null && !current);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const generation = ++loadSequence.current;
      const isCurrent = () =>
        !signal?.aborted && generation === loadSequence.current;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          resource: tab,
          page: String(page),
          search: query,
        });
        if (tab === "trips" && tripFilter) params.set("trip", tripFilter);
        if (tab === "requests" && requestFilter)
          params.set("status", requestFilter);
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
        if (!isCurrent()) return;
        setLoaded({ resource: tab, ...parsed });
        if (
          tab === "trips" &&
          tripFilter &&
          pendingOpen.current === tripFilter
        ) {
          pendingOpen.current = "";
          const linked = parsed.rows
            .map((row) => resourceSchemas.trips.parse(row))
            .find((row) => row.id === tripFilter);
          if (linked) {
            setTrip(linked);
            const current = linked.experience_quotes.filter((quote) => quote.trip_updated_at === linked.updated_at)
              .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
            if (current[0]?.status !== "sent")
              setQuote(current.find((quote) => quote.status === "draft") ?? "new");
          }
          else setError("Il viaggio associato non è più disponibile.");
        }
      } catch (cause) {
        if (!isCurrent()) return;
        console.error("[experience-admin] Load failed:", cause);
        setLoaded({ resource: tab, rows: [], total: 0 });
        setError(
          cause instanceof Error ? cause.message : "Caricamento non riuscito.",
        );
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [tab, page, query, tripFilter, requestFilter],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  function changeTab(next: Resource) {
    pendingOpen.current = "";
    setTab(next);
    setPage(0);
    setQuery("");
    setSearch("");
    setEditing(null);
    setServiceTemplate(null);
    setTrip(null);
    setQuote(null);
    setTripFilter("");
    setRequestFilter("");
    setSelectedRequest(null);
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
  async function toggleService(service: Service) {
    setUpdatingService(service.id);
    setError("");
    setNotice("");
    try {
      const { id, updated_at, created_at: _createdAt, ...data } = service;
      await apiSave({ action: "service", id, updated_at, data: { ...data, active: !service.active } });
      await load();
      setNotice(service.active
        ? "Voce archiviata. È esclusa dalle nuove selezioni del listino."
        : "Voce riattivata e disponibile nelle nuove selezioni.");
    } catch (cause) {
      console.error("[experience-admin] Service status failed:", cause);
      setError(cause instanceof Error ? cause.message : "Impossibile aggiornare la voce.");
    } finally {
      setUpdatingService(null);
    }
  }
  async function saved(message = "Dati salvati.") {
    setEditing(null);
    setServiceTemplate(null);
    setQuote(null);
    setTrip(null);
    setNotice(message);
    await load();
  }
  function openLinkedTrip(id: string) {
    changeTab("trips");
    pendingOpen.current = id;
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
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
      >
        {Object.entries(tabs).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => changeTab(key as Resource)}
            aria-current={
              tab === key || (tab === "trips" && key === "requests")
                ? "page"
                : undefined
            }
            className={`${button} ${tab === key || (tab === "trips" && key === "requests") ? "bg-soft-black text-white" : "bg-white"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {(tab === "requests" || tab === "trips") && (
        <nav
          aria-label="Viste delle pratiche Experience"
          className="flex flex-wrap gap-2"
        >
          <button
            type="button"
            className={button}
            aria-pressed={tab === "requests"}
            onClick={() => changeTab("requests")}
          >
            Richieste ricevute
          </button>
          <button
            type="button"
            className={button}
            aria-pressed={tab === "trips"}
            onClick={() => changeTab("trips")}
          >
            Viaggi e preventivi
          </button>
        </nav>
      )}
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
          key={serviceTemplate?.key ?? tab}
          resource={tab}
          record={editing}
          serviceTemplate={serviceTemplate}
          onCancel={() => {
            setEditing(null);
            setServiceTemplate(null);
          }}
          onSaved={saved}
        />
      ) : trip ? (
        <section className="space-y-5">
          <button
            type="button"
            className={button}
            onClick={() => {
              if (tripFilter) {
                changeTab("requests");
                return;
              }
              setTrip(null);
              setQuote(null);
            }}
          >
            <ArrowLeft size={16} />
            {tripFilter ? "Torna alle richieste" : "Torna ai viaggi"}
          </button>
          {!quote && <TripNextStep trip={trip} onEditQuote={setQuote} />}
          <TripDetails trip={trip} />
          <div hidden={Boolean(quote)}>
            <SupplierPdf key={trip.id} trip={trip} />
          </div>
          {quote ? (
            <QuoteEditor
              key={quote === "new" ? "new" : quote.id}
              trip={trip}
              quote={quote}
              onCancel={() => setQuote(null)}
              onSaved={saved}
            />
          ) : (
            <section id="experience-trip-quotes" className="scroll-mt-24 space-y-5" aria-labelledby="experience-trip-quotes-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="experience-trip-quotes-title" className="font-display text-3xl">
                  Preventivi del viaggio
                </h2>
                <button className={primary} onClick={() => setQuote("new")}>
                  <Plus size={17} />
                  Nuovo preventivo
                </button>
              </div>
              <p className="text-sm leading-6 text-soft-black/70">
                Con «Nuovo preventivo» compili la proposta per questo viaggio.
                Puoi salvarla come bozza e riprenderla in seguito.
              </p>
              {!trip.experience_quotes.length && (
                <section className="space-y-2 border border-pearl-grey bg-white p-5" aria-label="Voci da quotare">
                  <h3 className="font-semibold">Voci da quotare</h3>
                  <p className="text-sm">Apri «Nuovo preventivo» per recuperare le tariffe disponibili nel listino.</p>
                  <ul className="list-inside list-disc break-words text-sm">
                    {supplierRequestServices(trip.payload.ids).map(({ id, title }) => <li key={id}>{title}</li>)}
                    {trip.payload.details?.stops.filter((stop) => stop.trim()).map((stop, index) => <li key={index}>{stop}</li>)}
                  </ul>
                </section>
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
                    <section aria-label="Servizi del preventivo" className="space-y-2 border border-pearl-grey bg-warm-white p-4">
                      <h4 className="font-semibold">Servizi del preventivo</h4>
                      {q.experience_quote_details?.items.length ? (
                        <ul className="divide-y divide-pearl-grey text-sm">
                          {q.experience_quote_details.items.map((item, index) => (
                            <li key={index} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2">
                              <span className="min-w-0 break-words">{item.label}</span>
                              <span className="tabular-nums">
                                {item.quantity} × {money(item.price_cents)} · <strong>{money(item.quantity * item.price_cents)}</strong>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : q.inclusions.length ? (
                        <ul className="list-inside list-disc break-words text-sm">
                          {q.inclusions.map((label, index) => <li key={index}>{label}</li>)}
                        </ul>
                      ) : (
                        <p className="text-sm">Nessun dettaglio disponibile per questa versione.</p>
                      )}
                    </section>
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
                    {q.status === "sent" && <BookingPanel quote={q} />}
                    <p className="text-sm text-soft-black/75">
                      {q.status === "draft"
                        ? "Scarica il PDF per controllare il documento o riapri la bozza per completarla."
                        : "Scarica il PDF pubblicato o crea una nuova bozza partendo da questa proposta."}
                    </p>
                  </article>
                ))}
            </section>
          )}
        </section>
      ) : (
        <>
          {tab === "services" && (
            <>
              <PartnerQuote />
              <h2 className="font-display text-3xl">Voci registrate nel listino</h2>
            </>
          )}
          {(tab === "requests" || tab === "trips") && (
            <div className="flex flex-wrap items-end gap-3">
              <div
                className="flex gap-2"
                aria-label="Visualizzazione"
                role="group"
              >
                <button
                  type="button"
                  aria-pressed={recordsView === "list"}
                  className={`${button} ${recordsView === "list" ? "bg-soft-black text-white" : ""}`}
                  onClick={() => setRecordsView("list")}
                >
                  Elenco compatto
                </button>
                <button
                  type="button"
                  aria-pressed={recordsView === "cards"}
                  className={`${button} ${recordsView === "cards" ? "bg-soft-black text-white" : ""}`}
                  onClick={() => setRecordsView("cards")}
                >
                  Schede
                </button>
              </div>
              {tab === "requests" && (
                <Field label="Filtra per stato">
                  <select
                    value={requestFilter}
                    className={cls}
                    onChange={(event) => {
                      setRequestFilter(event.target.value);
                      setPage(0);
                      setSelectedRequest(null);
                    }}
                  >
                    <option value="">Tutti gli stati</option>
                    {Object.entries(requestStatuses).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          )}
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
                disabled={sectionLoading}
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
          {(tab === "services" || tab === "suppliers") && (
            <p className="text-sm text-soft-black/75">
              {tab === "services"
                ? "Con «Nuova voce di listino» salvi un servizio, il costo a noi e il prezzo cliente per i prossimi preventivi."
                : "Con «Nuovo fornitore» registri l’operatore e il recapito da usare per le richieste di quotazione."}
            </p>
          )}
          {tripFilter && (
            <button className={button} onClick={() => setTripFilter("")}>
              Mostra tutti i viaggi
            </button>
          )}
          <p className="text-sm text-soft-black/65">
            {sectionLoading
              ? "Caricamento…"
              : `${total} risultati · Pagina ${page + 1}`}
          </p>
          {sectionLoading ? (
            <p role="status" className="border border-pearl-grey bg-white p-8">
              Caricamento della sezione…
            </p>
          ) : !error && rows.length === 0 ? (
            <div className="border border-pearl-grey bg-white p-8">
              <h2 className="font-display text-2xl">Nessun risultato</h2>
              <p className="mt-2 text-base text-soft-black/70">
                {query || requestFilter
                  ? "Modifichi la ricerca o il filtro."
                  : tab === "requests"
                    ? "Qui compariranno le richieste inviate dal modulo Experience, anche senza account."
                    : tab === "trips"
                      ? "Qui compariranno i programmi salvati dai clienti registrati. Salvare un viaggio non equivale a inviare una richiesta."
                      : tab === "services"
                        ? "Scelga un servizio dal catalogo qui sotto per creare la prima voce con i suoi prezzi."
                        : "Aggiunga il primo fornitore."}
              </p>
            </div>
          ) : (
            <div
              className={
                recordsView === "list" &&
                (tab === "requests" || tab === "trips")
                  ? "grid gap-2"
                  : "grid gap-4 lg:grid-cols-2"
              }
            >
              {rows.map((value) => {
                if (tab === "requests") {
                  const r = resourceSchemas.requests.parse(value);
                  return (
                    <RequestCard
                      key={r.id}
                      request={r}
                      compact={recordsView === "list"}
                      expanded={selectedRequest === r.id}
                      onToggle={() =>
                        setSelectedRequest(
                          selectedRequest === r.id ? null : r.id,
                        )
                      }
                      onChange={status}
                      onOpenTrip={openLinkedTrip}
                    />
                  );
                }
                if (tab === "trips") {
                  const t = resourceSchemas.trips.parse(value);
                  return (
                    <article
                      className={`min-w-0 border border-pearl-grey bg-white p-4 ${recordsView === "list" ? "flex flex-wrap items-center justify-between gap-3" : "space-y-3"}`}
                      key={t.id}
                    >
                      <div className="min-w-0">
                        <h2 className="break-words font-display text-xl">
                          {t.title}
                        </h2>
                        <p className="break-words text-sm">
                          {t.customer?.full_name || (t.user_id ? "Cliente registrato" : "Cliente ospite")} ·{" "}
                          {t.customer?.email ||
                            "Email non disponibile nel profilo"}
                        </p>
                      </div>
                      <p className="text-sm">
                        {t.payload.lake} ·{" "}
                        {t.payload.details?.guests ?? "Ospiti da definire"}
                      </p>
                      <p className="text-sm text-soft-black/65">
                        Aggiornato: {date(t.updated_at)} ·{" "}
                        {t.experience_quotes.length} preventivi
                      </p>
                      <div className="space-y-1">
                        <button className={primary} onClick={() => setTrip(t)}>
                          Apri viaggio e preventivi
                        </button>
                        <p className="text-sm text-soft-black/75">
                          Consulta le tappe e prepara le richieste ai fornitori o il preventivo cliente.
                        </p>
                      </div>
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
                      {experienceLabels[s.experience_id] ||
                        "Servizio personalizzato"}{" "}
                      · {s.lake} · Per {s.unit}
                    </p>
                    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt>Costo a noi</dt>
                        <dd className="mt-1 font-medium">
                          {money(s.cost_cents)}
                        </dd>
                      </div>
                      <div>
                        <dt>Prezzo cliente</dt>
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
                    <div className="flex flex-wrap gap-2">
                      <button className={button} disabled={Boolean(updatingService)} onClick={() => setEditing(s)}>
                        Modifica voce di listino
                      </button>
                      <button type="button" className={button} disabled={Boolean(updatingService)}
                        onClick={() => void toggleService(s)}>
                        {updatingService === s.id ? "Aggiornamento…" : s.active ? "Archivia voce" : "Riattiva voce"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              className={button}
              disabled={page === 0 || sectionLoading}
              onClick={() => setPage((p) => p - 1)}
            >
              Pagina precedente
            </button>
            <button
              className={button}
              disabled={(page + 1) * 30 >= total || sectionLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Pagina successiva
            </button>
          </div>
          {tab === "services" && (
            <ServiceCatalog
              onAdd={(template) => {
                setServiceTemplate(template);
                setEditing("new");
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
function ServiceCatalog({
  onAdd,
}: {
  onAdd: (template: ServiceTemplate) => void;
}) {
  const [group, setGroup] = useState("all");
  return (
    <section
      className="space-y-5 border-t border-pearl-grey pt-6"
      aria-labelledby="experience-service-catalog"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="experience-service-catalog" className="font-display text-3xl">
            Catalogo dei servizi
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-6 text-soft-black/75">
            Parta da una scheda per salvare i suoi prezzi. Può creare voci
            diverse per lo stesso servizio, per esempio per fornitore, durata o
            stagione.
          </p>
        </div>
        <Field label="Filtra per categoria">
          <select
            className={cls}
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="all">Tutte le categorie</option>
            {catalogGroups.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {catalogGroups
        .filter((category) => group === "all" || category.id === group)
        .map((category) => (
          <div key={category.id} className="space-y-3">
            <h3 className="font-display text-2xl">{category.label}</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {serviceCatalog
                .filter((item) => item.group === category.id)
                .map((item) => (
                  <article
                    key={item.key}
                    className="flex flex-col items-start gap-3 border border-pearl-grey bg-white p-4"
                  >
                    <p className="text-xs font-medium uppercase tracking-wider text-soft-black/70">
                      {item.lake === "Entrambi"
                        ? "Lago di Como · Lago Maggiore"
                        : item.lake}
                    </p>
                    <h4 className="text-base font-semibold">{item.title}</h4>
                    <p className="mb-2 flex-1 text-sm leading-6 text-soft-black/75">
                      {item.description}
                    </p>
                    <button
                      type="button"
                      className={button}
                      onClick={() => onAdd(item)}
                      aria-label={`Aggiungi al listino: ${item.title}`}
                    >
                      <Plus size={16} aria-hidden="true" /> Aggiungi al listino
                    </button>
                  </article>
                ))}
            </div>
          </div>
        ))}
    </section>
  );
}
const requestFacts = [
  "Destinazione",
  "Punto di arrivo",
  "Hotel",
  "Tappe richieste",
  "Arrivo",
  "Partenza",
  "Ospiti",
  "Budget totale indicativo",
  "Interessi",
  "Formula desiderata",
] as const;

function RequestCard({
  request,
  compact,
  expanded,
  onToggle,
  onChange,
  onOpenTrip,
}: {
  request: AdminRequest;
  compact: boolean;
  expanded: boolean;
  onToggle: () => void;
  onChange: (request: AdminRequest, next: string) => Promise<void>;
  onOpenTrip: (id: string) => void;
}) {
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestError, setGuestError] = useState("");
  const lines = request.messaggio.split(/\r?\n/);
  const isStructured =
    lines[0] === "SILKinCOM EXPERIENCE — Richiesta di itinerario" &&
    requestFacts.every((label, index) =>
      lines[index + 1]?.startsWith(label + ": "),
    );
  const noteLine = isStructured
    ? lines.findIndex((line) => line.startsWith("Note: "))
    : -1;
  const endNote = lines.findIndex(
    (line, index) =>
      index > noteLine &&
      line.startsWith("Informativa privacy presa in visione."),
  );
  const notes =
    noteLine < 0
      ? ""
      : lines
          .slice(noteLine, endNote > noteLine ? endNote : undefined)
          .join("\n")
          .slice(6);
  const linked = request.experience_trip_id ?? request.messaggio.match(
    /\n\nViaggio account verificato: ([0-9a-f-]{36})\nNome: [^\r\n]+\nVersione: [^\r\n]+$/i,
  )?.[1];
  return (
    <article
      className={`min-w-0 border border-pearl-grey bg-white p-4 ${compact ? "" : "space-y-4"}`}
    >
      <header
        className={
          compact
            ? "grid items-center gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(7rem,1fr)_auto]"
            : "space-y-2"
        }
      >
        <div className="min-w-0">
          <h2 className="break-words font-display text-xl">
            {[request.nome, request.cognome].filter(Boolean).join(" ") ||
              request.email}
          </h2>
          <p className="break-words text-sm">
            {request.email}
            {request.telefono ? ` · ${request.telefono}` : ""}
          </p>
        </div>
        <div className="text-sm">
          <p className="font-medium">{requestStatuses[request.status]}</p>
          <p className="text-soft-black/70">{date(request.created_at)}</p>
        </div>
        <button
          type="button"
          className={button}
          aria-expanded={expanded}
          aria-controls={`experience-request-${request.id}`}
          onClick={onToggle}
        >
          {expanded ? "Chiudi richiesta" : "Leggi la richiesta"}
        </button>
        {linked && (
          <button type="button" className={primary} onClick={() => onOpenTrip(linked)}>
            Apri preventivo della richiesta
          </button>
        )}
      </header>
      {!expanded && (
        <p className="mt-2 text-sm text-soft-black/75">
          Apri la richiesta per vedere recapiti, preferenze e stato della pratica.
        </p>
      )}
      <div
        id={`experience-request-${request.id}`}
        hidden={!expanded}
        className="mt-4 space-y-4 border-t border-pearl-grey pt-4"
      >
        <RequestStatus request={request} onChange={onChange} />
        {isStructured && (
          <>
            <dl className="grid gap-3 bg-warm-white p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {requestFacts.map((label, index) => (
                <div key={label} className="min-w-0 break-words">
                  <dt className="font-semibold">{label}</dt>
                  <dd>
                    {lines[index + 1].slice(label.length + 2) || "Non indicato"}
                  </dd>
                </div>
              ))}
            </dl>
            <div>
              <h3 className="text-base font-semibold">Note del cliente</h3>
              <p className="whitespace-pre-wrap break-words text-sm">
                {notes || "Nessuna nota"}
              </p>
            </div>
          </>
        )}
        {isStructured ? (
          <details className="border border-pearl-grey p-3">
            <summary className="cursor-pointer py-2 text-sm">
              Testo originale della richiesta
            </summary>
            <p className="whitespace-pre-wrap break-words text-sm leading-7">
              {request.messaggio}
            </p>
          </details>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-7">
            {request.messaggio}
          </p>
        )}
        {!linked && (
          <div className="space-y-2">
            <button type="button" className={primary} disabled={guestBusy} onClick={async () => {
              setGuestBusy(true);
              setGuestError("");
              try {
                const result = await bookingAction({ action: "guest", contact: request.id });
                onOpenTrip(z.string().uuid().parse(result.id));
              } catch (cause) {
                setGuestError(cause instanceof Error ? cause.message : "Pratica non disponibile.");
              } finally {
                setGuestBusy(false);
              }
            }}>{guestBusy ? "Apertura…" : "Apri pratica ospite"}</button>
            {guestError && <Alert>{guestError}</Alert>}
          </div>
        )}
      </div>
    </article>
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
      <span className="block text-xs font-normal text-soft-black/70">
        Stato interno. Il cambio di stato non invia email al cliente.
      </span>
    </Field>
  );
}
async function bookingAction(body: Record<string, unknown>) {
  const response = await fetch("/api/admin/experience/booking", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Operazione non disponibile.");
  return result;
}

const bookingStatus = z.object({
  accepted_at: z.string().nullable(),
  deposit_at: z.string().nullable(),
  balance_at: z.string().nullable(),
  deposit_session: z.string().nullable(),
  balance_session: z.string().nullable(),
});

function BookingPanel({ quote }: { quote: AdminQuote }) {
  const [booking, setBooking] = useState<z.infer<typeof bookingStatus> | null>();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const deposit = Math.ceil(quote.total_cents / 2);
  const phase = booking?.deposit_at ? "balance" : "deposit";
  const amount = phase === "deposit" ? deposit : quote.total_cents - deposit;
  const settled = Boolean(booking?.balance_at || (booking?.deposit_at && amount === 0));
  const pendingStripe = phase === "deposit" ? booking?.deposit_session : booking?.balance_session;

  async function execute(action: "status" | "share" | "deposit" | "balance") {
    setBusy(true);
    setError("");
    try {
      if (action === "share") {
        const result = await bookingAction({ action, quote: quote.id });
        const path = z.string().regex(/^\/it\/experience\/preventivo#[a-f0-9]{64}$/).parse(result.path);
        setUrl(new URL(path, window.location.origin).href);
      } else if (action !== "status") {
        await bookingAction({ action, quote: quote.id, amount, reference });
        setReference("");
      }
      const result = await bookingAction({ action: "status", quote: quote.id });
      setBooking(bookingStatus.nullable().parse(result.booking));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Operazione non disponibile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 border border-pearl-grey bg-warm-white p-4" aria-label="Accettazione e pagamenti">
      <h4 className="font-semibold">Accettazione e pagamenti</h4>
      <p className="text-sm">Invia il link privato al cliente. Può leggere e accettare il preventivo anche senza account.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primary} disabled={busy} onClick={() => void execute("share")}>Genera link privato</button>
        <button type="button" className={button} disabled={busy} onClick={() => void execute("status")}>Aggiorna stato e incassi</button>
      </div>
      {url && <Field label="Link da copiare e inviare al cliente"><input readOnly value={url} className={cls} onFocus={(event) => event.currentTarget.select()} /></Field>}
      {url && <p className="text-sm">Generando un nuovo link, quello precedente viene revocato.</p>}
      {booking && <p role="status" className={settled ? successNotice : infoNotice}>{settled ? "Saldo registrato."
        : booking.deposit_at ? "Acconto registrato. In attesa del saldo."
        : booking.accepted_at ? "Preventivo accettato. In attesa dell’acconto."
        : "In attesa dell’accettazione del cliente."}</p>}
      {booking?.accepted_at && !settled && (pendingStripe
        ? <p className={infoNotice}>Pagamento con carta avviato. Aggiorna lo stato dopo la verifica di Stripe.</p>
        : <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); void execute(phase); }}>
            <Field label="Riferimento del pagamento verificato">
              <input className={cls} required maxLength={140} value={reference} onChange={(event) => setReference(event.target.value)} />
            </Field>
            <button className={confirmAction} disabled={busy || !reference.trim()}>
              Registra {phase === "deposit" ? "acconto" : "saldo"} · {money(amount)}
            </button>
          </form>)}
      {error && <Alert>{error}</Alert>}
    </section>
  );
}

function TripNextStep({
  trip,
  onEditQuote,
}: {
  trip: AdminTrip;
  onEditQuote: (quote: AdminQuote | "new") => void;
}) {
  const quotes = [...trip.experience_quotes].sort(
    (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at),
  );
  const draft = quotes.find((quote) => quote.status === "draft");
  const published = quotes.find((quote) => quote.status === "sent");
  const currentDraft = draft?.trip_updated_at === trip.updated_at ? draft : undefined;
  const validPublished = published?.trip_updated_at === trip.updated_at
    && published.valid_until && Date.parse(published.valid_until) > Date.now()
    ? published
    : undefined;
  const previous = draft || published;
  const needsUpdate = previous && !currentDraft && !validPublished;
  const status = currentDraft ? "Bozza da completare"
    : validPublished ? "Preventivo pubblicato"
    : needsUpdate ? "Preventivo da aggiornare"
    : "Preventivo da preparare";
  const description = currentDraft
    ? "Riprendi la bozza, controlla prezzi e condizioni e pubblicala quando è pronta."
    : validPublished
      ? "Il cliente può consultare la proposta e scaricare il PDF in «I miei viaggi»."
      : needsUpdate
        ? "Controlla le scelte e la validità della proposta, poi prepara una nuova revisione."
        : "Verifica disponibilità e costi dei servizi, poi prepara il preventivo per il cliente.";

  function openSupplierQuotes() {
    const details = document.getElementById("experience-trip-suppliers");
    if (!(details instanceof HTMLDetailsElement)) return;
    details.open = true;
    details.scrollIntoView({ block: "start" });
    details.querySelector("summary")?.focus({ preventScroll: true });
  }

  return (
    <section aria-labelledby="experience-next-step" className="space-y-4 border border-pearl-grey bg-white p-4 sm:p-6">
      <div className={validPublished && !currentDraft ? successNotice : checkNotice}>
        <p className="text-xs font-semibold uppercase tracking-wide">Prossimo passo</p>
        <h2 id="experience-next-step" className="mt-1 text-lg font-semibold">{status}</h2>
        <p className="mt-1">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {validPublished && !currentDraft ? (
          <a href="#experience-trip-quotes" className={primary}>Visualizza preventivi</a>
        ) : (
          <button type="button" className={confirmAction} onClick={() => onEditQuote(
            currentDraft || (previous ? { ...previous, id: "", status: "draft" } : "new"),
          )}>
            {currentDraft ? "Riprendi bozza" : previous ? "Prepara revisione" : "Prepara preventivo"}
          </button>
        )}
        <button type="button" className={supplierAction} onClick={openSupplierQuotes}>
          Quotazioni fornitori
        </button>
      </div>
    </section>
  );
}

function TripDetails({ trip }: { trip: AdminTrip }) {
  const d = trip.payload.details;
  const hasPickup = trip.payload.ids.includes("service:pickup");
  const stops = d?.stops.map((stop) => stop.trim()).filter(Boolean) ?? [];
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
      <section aria-label="Pacchetti scelti dal cliente" className="space-y-2">
        <h3 className="font-semibold">Pacchetti scelti dal cliente</h3>
        {trip.payload.ids.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {supplierRequestServices(trip.payload.ids).map(({ id, title, format }) => (
              <li className="min-w-0 break-words border border-pearl-grey bg-warm-white p-3 text-sm" key={id}>
                <p className="font-medium">{title}</p>
                {format && <p className="text-soft-black/75">{format}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-soft-black/75">Nessuna scelta da importare. Puoi aggiungere i servizi dal listino.</p>}
      </section>
      {hasPickup && (
        <section
          aria-label="Trasferimento all’arrivo"
          className="space-y-2 border border-pearl-grey bg-warm-white p-4"
        >
          <h3 className="text-base font-semibold">Trasferimento all’arrivo</h3>
          <dl className="grid gap-3 text-sm leading-6 sm:grid-cols-2">
            <div className="min-w-0 break-words">
              <dt className="font-medium">Da · aeroporto o stazione</dt>
              <dd>{d?.arrivalPoint.trim() || "Da confermare"}</dd>
            </div>
            <div className="min-w-0 break-words">
              <dt className="font-medium">A · hotel o prima tappa</dt>
              <dd>{d?.hotel.trim() || "Da confermare"}</dd>
            </div>
          </dl>
        </section>
      )}
      {d && (
        <dl className="grid gap-4 text-sm leading-6 sm:grid-cols-2">
          {!hasPickup && (
            <div>
              <dt className="font-medium">Arrivo / hotel</dt>
              <dd>
                {d.arrivalPoint || "Da definire"}
                <br />
                {d.hotel || "Da definire"}
              </dd>
            </div>
          )}
          <div>
            <dt className="font-medium">Budget indicativo</dt>
            <dd>
              {d.budget
                ? money(Math.round(Number(d.budget) * 100))
                : "Da definire"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium">Tappe richieste</dt>
            <dd>
              {stops.length ? (
                <ol className="list-decimal break-words pl-5">
                  {stops.map((stop, index) => (
                    <li key={index}>{stop}</li>
                  ))}
                </ol>
              ) : (
                "Nessuna tappa indicata"
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium">Note del cliente</dt>
            <dd className="whitespace-pre-wrap break-words">
              {d.notes.trim() || "Nessuna nota del cliente"}
            </dd>
          </div>
        </dl>
      )}
    </article>
  );
}
type QueuedSupplierRequest = {
  supplier: Supplier;
  services: string[];
};

function downloadSupplierFile(contents: Blob, filename: string) {
  const url = URL.createObjectURL(contents);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function postSupplierRequest(
  trip: AdminTrip,
  body: Record<string, unknown>,
) {
  const response = await fetch(
    `/api/admin/experience/trips/${trip.id}/supplier-pdf`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trip_version: trip.updated_at, ...body }),
    },
  );
  if (!response.ok) {
    const data = await response.json();
    throw new Error(
      data.error || "Non è stato possibile preparare la richiesta.",
    );
  }
  return response;
}

function SupplierEmailSender({
  request,
  sendEmail,
  loadPdf,
  onClose,
}: {
  request: QueuedSupplierRequest;
  sendEmail: (email: string) => Promise<Response>;
  loadPdf: () => Promise<Blob>;
  onClose: () => void;
}) {
  const [email, setEmail] = useState(request.supplier.email);
  const [status, setStatus] = useState<"idle" | "busy" | "sent">("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const previewUrl = useRef("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);
  async function previewAttachment() {
    setPdfBusy(true);
    setError("");
    try {
      const blob = await loadPdf();
      if (!mounted.current) return;
      if (blob.type !== "application/pdf") throw new Error("Il PDF non è disponibile.");
      previewUrl.current = URL.createObjectURL(blob);
      setPdfUrl(previewUrl.current);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Anteprima non disponibile.");
    } finally {
      if (mounted.current) setPdfBusy(false);
    }
  }
  const busy = useRef(false);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || status === "sent") return;
    const parsed = z.string().trim().email().max(254).safeParse(email);
    if (!parsed.success) {
      setError("Controlli l’indirizzo email del destinatario.");
      return;
    }
    busy.current = true;
    setStatus("busy");
    setError("");
    try {
      const response = await sendEmail(parsed.data);
      const result = z
        .object({
          ok: z.literal(true),
          code: z.string().regex(/^EXP-F-[0-9A-F]{12}$/),
        })
        .parse(await response.json());
      setCode(result.code);
      setStatus("sent");
      setEmail(parsed.data);
    } catch (error) {
      console.error("[experience-admin] Supplier email failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "L’invio non è stato confermato.",
      );
      setStatus("idle");
    } finally {
      busy.current = false;
    }
  }
  return (
    <form
      onSubmit={send}
      className="space-y-3 rounded-sm border border-pearl-grey bg-white p-4"
    >
      <Field label={`Email per ${request.supplier.name}`}>
        <input
          className={cls}
          type="email"
          required
          value={email}
          maxLength={254}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
          }}
          disabled={status !== "idle"}
        />
      </Field>
      <p className="text-sm text-soft-black/70">
        L’indirizzo vale per questo invio. L’email contiene il PDF per il
        fornitore.
      </p>
      <section aria-label="Allegato per il fornitore" className="space-y-2">
        <p className="font-medium">Servizi nell’allegato</p>
        <ul className="list-inside list-disc text-sm">
          {request.services.map((id) => <li key={id}>{experienceLabels[id] ?? "Voce del listino selezionata"}</li>)}
        </ul>
        {pdfUrl ? (
          <>
            <a className={button} href={pdfUrl} target="_blank" rel="noopener noreferrer">Apri il PDF in una nuova scheda</a>
            <iframe className="h-80 w-full border border-pearl-grey" src={pdfUrl} title="Anteprima PDF per il fornitore" />
          </>
        ) : (
          <button type="button" className={button} disabled={pdfBusy} onClick={() => void previewAttachment()}>
            {pdfBusy ? "Preparazione anteprima…" : "Mostra anteprima PDF"}
          </button>
        )}
      </section>
      {error && <Alert>{error}</Alert>}
      {status === "sent" && (
        <p role="status" className={successNotice}>
          Invio accettato per <strong>{email}</strong>. Codice: {code}.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={confirmAction} disabled={status !== "idle"}>
          {status === "busy" ? "Invio in corso…" : "Invia richiesta con PDF"}
        </button>
        <button
          type="button"
          className={button}
          onClick={onClose}
          disabled={status === "busy"}
        >
          Chiudi
        </button>
      </div>
    </form>
  );
}

async function postPartnerQuote(request: QueuedSupplierRequest, confirmation?: { email: string; request_code: string }) {
  const response = await fetch("/api/admin/experience/partner-quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ supplier_id: request.supplier.id, services: request.services, ...confirmation }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Non è stato possibile preparare la richiesta.");
  }
  return response;
}

function PartnerQuote() {
  const [open, setOpen] = useState(false);
  return (
    <section className="space-y-3 border border-pearl-grey bg-white p-4 sm:p-6">
      <button type="button" className={supplierAction} aria-expanded={open} onClick={() => setOpen(!open)}>
        Chiedi tariffa partner
      </button>
      <p className="max-w-prose text-sm text-soft-black/75">
        Richiedi prezzi riservati a SILKinCOM per uno o più servizi del listino, anche senza una pratica cliente.
      </p>
      {open && <PartnerQuoteForm />}
    </section>
  );
}

function PartnerQuoteForm() {
  const suppliers = useSupplierOptions();
  const [services, setServices] = useState<Service[] | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ request: QueuedSupplierRequest; code: string; pdf: Blob } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    loadOptions("services", controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted)
          setServices(rows.map((row) => resourceSchemas.services.parse(row)).filter((row) => row.active));
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          console.error("[experience-admin] Partner services failed:", cause);
          setLoadError("Listino non disponibile. Riapri la scheda per riprovare.");
        }
      });
    return () => controller.abort();
  }, []);

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supplier = suppliers.suppliers.find((row) => row.id === supplierId);
    if (!supplier || !selected.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const request = { supplier, services: selected };
      const response = await postPartnerQuote(request);
      const code = z.string().regex(/^EXP-F-[0-9A-F]{12}$/).parse(response.headers.get("X-Experience-Request-Code"));
      setPreview({ request, code, pdf: await response.blob() });
    } catch (cause) {
      console.error("[experience-admin] Partner preview failed:", cause);
      setError(cause instanceof Error ? cause.message : "PDF non disponibile.");
    } finally {
      setBusy(false);
    }
  }

  if (loadError || suppliers.error) return <Alert>{loadError || suppliers.error}</Alert>;
  if (!services || suppliers.loading) return <p role="status">Caricamento del listino e dei fornitori…</p>;
  const activeSuppliers = suppliers.suppliers.filter((row) => row.status !== "inactive");
  if (!activeSuppliers.length) return <p>Aggiungi prima un operatore attivo nella scheda «Fornitori».</p>;
  if (!services.length) return <p>Aggiungi prima almeno un servizio attivo nel listino.</p>;

  if (preview) return (
    <div className="space-y-3">
      <p role="status" className={successNotice}>PDF pronto. Scaricalo per controllarlo, poi verifica il destinatario e invia l’email.</p>
      <ul className="list-inside list-disc text-sm">
        {services.filter((row) => selected.includes(row.id)).map((row) => <li key={row.id}>{row.title} · {row.lake}</li>)}
      </ul>
      <button type="button" className={button} onClick={() => downloadSupplierFile(preview.pdf, `SILKinCOM-${preview.code}.pdf`)}>
        Scarica PDF
      </button>
      <SupplierEmailSender
        request={preview.request}
        loadPdf={async () => preview.pdf}
        sendEmail={(email) => postPartnerQuote(preview.request, { email, request_code: preview.code })}
        onClose={() => setPreview(null)}
      />
    </div>
  );

  return (
    <form onSubmit={prepare} className="space-y-3">
      <Field label="1. Scegli il fornitore">
        <select className={cls} value={supplierId} required disabled={busy} onChange={(event) => setSupplierId(event.target.value)}>
          <option value="">Seleziona un fornitore</option>
          {activeSuppliers.map((row) => <option value={row.id} key={row.id}>{row.name}</option>)}
        </select>
      </Field>
      <fieldset disabled={busy} className="space-y-2">
        <legend className="mb-2 font-medium">2. Spunta i servizi da quotare</legend>
        <div className="max-h-64 overflow-y-auto rounded-sm border border-pearl-grey p-2">
          {services.map((row) => (
            <label key={row.id} className="flex min-h-11 items-center gap-3 px-2 text-sm">
              <input type="checkbox" checked={selected.includes(row.id)}
                disabled={selected.length >= MAX_PARTNER_SERVICES && !selected.includes(row.id)}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setSelected((previous) => checked ? [...previous, row.id] : previous.filter((id) => id !== row.id));
                }} />
              {row.title} · {row.lake} · per {row.unit}
            </label>
          ))}
        </div>
        <p className="text-sm text-soft-black/75">{selected.length} di {MAX_PARTNER_SERVICES} servizi selezionabili per PDF.</p>
      </fieldset>
      {error && <Alert>{error}</Alert>}
      <button type="submit" className={supplierAction} disabled={busy || !supplierId || !selected.length}>
        {busy ? "Preparazione del PDF…" : "3. Prepara il PDF"}
      </button>
    </form>
  );
}

function SupplierPdf({ trip }: { trip: AdminTrip }) {
  const options = supplierRequestServices(trip.payload.ids);
  const suppliers = useSupplierOptions();
  const [directRequest, setDirectRequest] = useState<QueuedSupplierRequest | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requestCode, setRequestCode] = useState("");
  const [queue, setQueue] = useState<QueuedSupplierRequest[]>([]);
  const [archiveCodes, setArchiveCodes] = useState<Record<string, string>>({});
  const [emailSupplier, setEmailSupplier] = useState("");
  const supplier = suppliers.suppliers.find(
    (entry) => entry.id === supplierId && entry.status !== "inactive",
  );
  const editingQueued = queue.some((entry) => entry.supplier.id === supplierId);

  async function download(services: string[], id: string) {
    if (busy || !services.length) return;
    setBusy(true);
    setError("");
    setRequestCode("");
    try {
      const response = await postSupplierRequest(trip, {
        services,
        ...(id ? { supplier_id: id } : {}),
      });
      const code = response.headers.get("x-experience-request-code");
      if (
        !code ||
        !/^EXP-F-[0-9A-F]{12}$/.test(code) ||
        !response.headers.get("content-type")?.startsWith("application/pdf")
      ) {
        throw new Error("Il documento ricevuto non è valido.");
      }
      downloadSupplierFile(await response.blob(), `SILKinCOM-${code}.pdf`);
      setRequestCode(code);
    } catch (cause) {
      console.error("[experience-admin] Supplier PDF failed:", cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Non è stato possibile creare il PDF.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function downloadArchive() {
    if (busy || !queue.length) return;
    setBusy(true);
    setError("");
    setArchiveCodes({});
    try {
      const response = await postSupplierRequest(trip, {
        requests: queue.map((entry) => ({
          supplier_id: entry.supplier.id,
          services: entry.services,
        })),
      });
      const codes = (
        response.headers.get("x-experience-request-codes") || ""
      ).split(",");
      if (
        !response.headers.get("content-type")?.startsWith("application/zip") ||
        codes.length !== queue.length ||
        new Set(codes).size !== queue.length ||
        codes.some((code) => !/^EXP-F-[0-9A-F]{12}$/.test(code))
      )
        throw new Error("L’archivio ricevuto non è valido.");
      downloadSupplierFile(
        await response.blob(),
        "SILKinCOM-richieste-fornitori.zip",
      );
      setArchiveCodes(
        Object.fromEntries(
          queue.map((entry, i) => [entry.supplier.id, codes[i]]),
        ),
      );
    } catch (error) {
      console.error("[experience-admin] Supplier archive failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Non è stato possibile creare l’archivio.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <details id="experience-trip-suppliers" className="scroll-mt-24 border border-pearl-grey bg-white p-5 sm:p-7">
      <summary className="cursor-pointer list-none space-y-2 [&::-webkit-details-marker]:hidden">
        <span className={`${supplierAction} justify-start`}>
          <FileDown aria-hidden="true" size={18} /> Richiesta al fornitore
        </span>
        <span className="block max-w-prose text-sm leading-6 text-soft-black/75">
          Scegli i servizi da quotare e invia il modulo all’operatore esterno.
        </span>
      </summary>
      <div className="mt-5 space-y-4">
        <p className="max-w-prose text-sm leading-6 text-soft-black/75">
          Il fornitore compila nel PDF la disponibilità e le tariffe orarie o
          a forfait, IVA inclusa, poi restituisce il modulo rispondendo
          all’email. Il PDF identifica il viaggio con un codice.
        </p>
        <Field label="Fornitore da consultare">
          <select
            className={cls}
            disabled={suppliers.loading || busy || Boolean(suppliers.error)}
            value={supplierId}
            onChange={(event) => {
              setSupplierId(event.target.value);
              setRequestCode("");
            }}
          >
            <option value="">
              {suppliers.loading
                ? "Caricamento dei fornitori…"
                : "Da assegnare"}
            </option>
            {suppliers.suppliers
              .filter((supplier) => supplier.status !== "inactive")
              .map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
          </select>
        </Field>
        {suppliers.error && <Alert>{suppliers.error}</Alert>}
        {options.length === 0 ? (
          <p className="text-sm">
            Aggiungi e salva almeno un servizio nel viaggio per creare la
            richiesta.
          </p>
        ) : (
          <>
            <fieldset disabled={busy} className="grid gap-2 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-semibold">
                Servizi da quotare
              </legend>
              {options.map(({ id, title }) => (
                <label
                  key={id}
                  className="flex min-h-12 items-center gap-3 border border-pearl-grey bg-warm-white px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-gold-dark"
                    checked={selected.includes(id)}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSelected((current) =>
                        checked
                          ? [...current, id]
                          : current.filter((value) => value !== id),
                      );
                      setDirectRequest(null);
                      setRequestCode("");
                      setError("");
                    }}
                  />
                  {title}
                </label>
              ))}
            </fieldset>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={supplier ? button : primary}
                disabled={busy || !selected.length}
                onClick={() => void download(selected, supplierId)}
              >
                Scarica PDF per fornitore
              </button>
              {supplier && (
                <button type="button" className={supplierAction} disabled={busy || !selected.length || Boolean(directRequest)}
                  onClick={() => setDirectRequest({ supplier, services: selected })}>
                  Prepara email al fornitore
                </button>
              )}
            </div>
            {directRequest && <SupplierEmailSender request={directRequest}
              onClose={() => setDirectRequest(null)}
              loadPdf={async () => (await postSupplierRequest(trip, {
                supplier_id: directRequest.supplier.id, services: directRequest.services,
              })).blob()}
              sendEmail={(email) => postSupplierRequest(trip, {
                action: "email", supplier_id: directRequest.supplier.id, services: directRequest.services, email,
              })} />}
            <details className="space-y-2">
              <summary className="cursor-pointer text-sm font-medium">Prepara PDF per più fornitori</summary>
              <button
                type="button"
                className={button}
                disabled={
                  busy ||
                  Boolean(emailSupplier) ||
                  !supplier ||
                  !selected.length ||
                  (!editingQueued && queue.length >= MAX_SUPPLIER_REQUESTS)
                }
                onClick={() => {
                  if (!supplier || !selected.length) return;
                  const request = { supplier, services: selected };
                  setQueue((current) =>
                    editingQueued
                      ? current.map((entry) =>
                          entry.supplier.id === supplier.id ? request : entry,
                        )
                      : [...current, request],
                  );
                  setArchiveCodes({});
                  setEmailSupplier("");
                  setRequestCode("");
                }}
              >
                {editingQueued
                  ? "Aggiorna richiesta per il fornitore"
                  : "Aggiungi alla lista dei PDF"}
              </button>
            </details>
            {queue.length >= MAX_SUPPLIER_REQUESTS && (
              <p className="text-sm">
                Può preparare fino a {MAX_SUPPLIER_REQUESTS} richieste per
                archivio.
              </p>
            )}
          </>
        )}
        {queue.length > 0 && (
          <section
            aria-label="PDF per i fornitori"
            className="space-y-3 border-t border-pearl-grey pt-4"
          >
            <h3 className="text-base font-semibold">PDF per i fornitori</h3>
            <p role="status" className={infoNotice}>
              Selezione pronta. Controlla il documento con «Scarica PDF». Per spedirlo, scegli «Invia email» e conferma il destinatario.
            </p>
            <ul className="space-y-2">
              {queue.map((entry) => (
                <li
                  key={entry.supplier.id}
                  className="space-y-2 border border-pearl-grey bg-warm-white p-4"
                >
                  <p className="break-words text-sm font-semibold">
                    {entry.supplier.name}
                  </p>
                  <p className="text-sm">
                    {options
                      .filter((option) => entry.services.includes(option.id))
                      .map((option) => option.title)
                      .join(" · ")}
                  </p>
                  {archiveCodes[entry.supplier.id] && (
                    <p className="text-xs">
                      Codice PDF: {archiveCodes[entry.supplier.id]}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={button}
                      disabled={busy}
                      onClick={() =>
                        void download(entry.services, entry.supplier.id)
                      }
                    >
                      Scarica PDF
                    </button>
                    <button
                      type="button"
                      className={supplierAction}
                      disabled={Boolean(emailSupplier)}
                      onClick={() => setEmailSupplier(entry.supplier.id)}
                    >
                      Invia email
                    </button>
                    <button
                      type="button"
                      className={button}
                      disabled={busy || Boolean(emailSupplier)}
                      onClick={() => {
                        setQueue((current) =>
                          current.filter(
                            (row) => row.supplier.id !== entry.supplier.id,
                          ),
                        );
                        setArchiveCodes({});
                      }}
                    >
                      Rimuovi dalla lista
                    </button>
                  </div>
                  {emailSupplier === entry.supplier.id && (
                    <SupplierEmailSender
                      request={entry}
                      loadPdf={async () => (await postSupplierRequest(trip, {
                        supplier_id: entry.supplier.id, services: entry.services,
                      })).blob()}
                      sendEmail={(email) => postSupplierRequest(trip, supplierEmailInput.parse({
                        action: "email", trip_version: trip.updated_at,
                        supplier_id: entry.supplier.id, services: entry.services, email,
                      }))}
                      onClose={() => setEmailSupplier("")}
                    />
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={primary}
              disabled={busy}
              onClick={() => void downloadArchive()}
            >
              <FileDown size={16} aria-hidden="true" />{" "}
              {busy
                ? "Creazione file…"
                : `Scarica tutti i PDF (${queue.length})`}
            </button>
            <p className="text-xs text-soft-black/70">
              L’archivio ZIP è per uso interno. A ciascun fornitore invii
              soltanto il suo PDF.
            </p>
          </section>
        )}
        {error && <Alert>{error}</Alert>}
        {requestCode && (
          <p role="status" className={successNotice}>
            PDF pronto. Codice richiesta <strong>{requestCode}</strong>.
          </p>
        )}
      </div>
    </details>
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
function useSupplierOptions() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    loadOptions("suppliers", controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted)
          setSuppliers(rows.map((row) => resourceSchemas.suppliers.parse(row)));
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          console.error("[experience-admin] Suppliers failed:", cause);
          setError(
            "Elenco fornitori non disponibile. Riapra la scheda per riprovare.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  return { suppliers, loading, error };
}
function InternalEditor({
  resource,
  record,
  serviceTemplate,
  onCancel,
  onSaved,
}: {
  resource: "suppliers" | "services";
  record: Supplier | Service | "new";
  serviceTemplate: ServiceTemplate | null;
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
            <input
              type="hidden"
              name="experience_id"
              value={
                service?.experience_id ??
                serviceTemplate?.experienceId ??
                customExperienceService
              }
            />
            <Field label="Nome della voce *">
              <input
                name="title"
                required
                maxLength={160}
                defaultValue={service?.title || serviceTemplate?.title}
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
                defaultValue={
                  service?.unit || serviceTemplate?.unit || "servizio"
                }
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
            <Field label="Costo a noi (€)">
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
            <Field label="Prezzo cliente (€)">
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
            defaultValue={
              supplier?.lake ||
              service?.lake ||
              serviceTemplate?.lake ||
              "Da definire"
            }
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
type QuoteEditorItem = QuoteItem & { included: boolean; priceEntered: boolean };

function keepQuoteRow(item: QuoteEditorItem) {
  return Boolean(
    item.label.trim() ||
    item.priceEntered ||
    item.cost_cents !== null ||
    item.supplier_id,
  );
}

function quoteItem(label = ""): QuoteEditorItem {
  return {
    label,
    quantity: 1,
    cost_cents: null,
    price_cents: 0,
    service_id: null,
    supplier_id: null,
    included: true,
    priceEntered: false,
  };
}
function QuoteServicePicker({
  trip,
  services,
  loading,
  available,
  onAdd,
}: {
  trip: AdminTrip;
  services: Service[];
  loading: boolean;
  available: number;
  onAdd: (items: QuoteEditorItem[]) => void;
}) {
  const [group, setGroup] = useState("all");
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const related = new Set(
    supplierRequestServices(trip.payload.ids).map(({ id }) => id),
  );
  const entries = [
    ...services.map((service) => ({
      key: service.id,
      title: service.title,
      group: "configured",
      requested: related.has(service.experience_id),
      summary: `${service.lake} · ${money(service.price_cents)} / ${service.unit}`,
      item: {
        ...quoteItem(service.title),
        price_cents: service.price_cents ?? 0,
        priceEntered: service.price_cents !== null,
        cost_cents: service.cost_cents,
        service_id: service.id,
        supplier_id: service.supplier_id,
      },
    })),
    ...serviceCatalog.map((service) => ({
      key: service.key,
      title: service.title,
      group: service.group,
      requested: related.has(service.key),
      summary: `${service.lake} · Prezzo da inserire`,
      item: quoteItem(service.title),
    })),
  ];
  const visible = entries.filter(
    (entry) =>
      (group === "all" ||
        (group === "requested" ? entry.requested : entry.group === group)) &&
      entry.title
        .toLocaleLowerCase("it")
        .includes(search.trim().toLocaleLowerCase("it")),
  );
  return (
    <details className="space-y-4 border border-pearl-grey bg-warm-white p-4">
      <summary className="min-h-10 cursor-pointer py-2 font-semibold">
        Scegli i servizi da quotare ({entries.length})
      </summary>
      <p className="text-sm leading-6 text-soft-black/75">
        Spunta uno o più servizi. Le tariffe del listino compilano la riga; per
        le altre voci inserisci il prezzo dopo averle aggiunte.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Cerca un servizio">
          <input
            className={cls}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <Field label="Categoria dei servizi da quotare">
          <select
            className={cls}
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="all">Tutti i servizi</option>
            <option value="requested">Richiesti dal cliente</option>
            <option value="configured">Tariffe salvate nel listino</option>
            {catalogGroups.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {loading && (
        <p role="status" className="text-sm">
          Caricamento delle tariffe salvate…
        </p>
      )}
      <fieldset className="max-h-72 overflow-auto px-1">
        <legend className="sr-only">Seleziona i servizi da quotare</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {visible.map((entry) => (
            <div key={entry.key} className="flex flex-wrap items-center justify-between gap-2 border border-pearl-grey bg-white px-3 py-2 text-sm">
            <label className="flex min-h-11 min-w-0 items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 accent-gold-dark"
                checked={selection.includes(entry.key)}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setNotice("");
                  setSelection((current) =>
                    checked
                      ? [...current, entry.key]
                      : current.filter((key) => key !== entry.key),
                  );
                }}
              />
              <span className="min-w-0 break-words">
                <span className="block font-medium">{entry.title}</span>
                <span className="block text-xs text-soft-black/70">
                  {entry.summary}
                  {entry.requested ? " · Richiesto dal cliente" : ""}
                </span>
              </span>
            </label>
            <button type="button" className={button} disabled={available < 1}
              aria-label={`Aggiungi card ${entry.title}`} onClick={() => {
                onAdd([entry.item]);
                setSelection((current) => current.filter((key) => key !== entry.key));
                setNotice("Servizio aggiunto al preventivo.");
              }}>Aggiungi</button>
            </div>
          ))}
        </div>
        {visible.length === 0 && (
          <p className="py-3 text-sm">
            Nessun servizio in questa selezione. Provi un’altra categoria o
            ricerca.
          </p>
        )}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={primary}
          disabled={selection.length === 0 || selection.length > available}
          onClick={() => {
            const selected = entries.filter((entry) =>
              selection.includes(entry.key),
            );
            onAdd(selected.map(({ item }) => item));
            setNotice(
              selected.length === 1
                ? "Servizio aggiunto al preventivo."
                : `${selected.length} servizi aggiunti al preventivo.`,
            );
            setSelection([]);
          }}
        >
          <Plus aria-hidden="true" size={16} /> Aggiungi al preventivo
          {selection.length ? ` (${selection.length})` : ""}
        </button>
        {selection.length > available && (
          <p className="text-sm">
            Può aggiungere ancora {available} servizi (massimo 30 righe).
          </p>
        )}
        {notice && (
          <p className="text-sm" role="status">
            {notice}
          </p>
        )}
      </div>
    </details>
  );
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
  const initialTerms = splitQuoteConditions(existing?.conditions || "");
  const [items, setItems] = useState<QuoteEditorItem[]>(() =>
    initial?.items.length
      ? initial.items.map((item) => ({
          ...item,
          included: Boolean(existing?.inclusions.includes(item.label.trim())),
          priceEntered: true,
        }))
      : [quoteItem()],
  );
  const [services, setServices] = useState<Service[]>([]);
  const suppliers = useSupplierOptions();
  const [loading, setLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [additionalInclusions, setAdditionalInclusions] = useState(
    () =>
      existing?.inclusions
        .filter(
          (text) => !initial?.items.some((item) => item.label.trim() === text),
        )
        .join("\n") || "",
  );
  const includedServices = Array.from(
    new Set([
      ...items
        .filter((item) => item.included)
        .map((item) => item.label.trim())
        .filter(Boolean),
      ...lines(additionalInclusions),
    ]),
  );
  const [exclusions, setExclusions] = useState(
    existing?.exclusions.join("\n") || "",
  );
  const [conditions, setConditions] = useState(initialTerms.conditions);
  const [paymentMethod, setPaymentMethod] = useState<QuotePaymentMethod | "">(
    initialTerms.method ?? (existing ? "" : "either"),
  );
  const [cardLink, setCardLink] = useState(initialTerms.link);
  const [cardAmount, setCardAmount] = useState<number | null>(
    initialTerms.link ? existing!.total_cents : null,
  );
  const [validUntil, setValidUntil] = useState(
    localDateTime(existing?.valid_until || null),
  );
  const [notes, setNotes] = useState(initial?.internal_notes || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(false);
  const totals = quoteTotals(items);
  const payment = paymentMethod
    ? quotePaymentTerms(totals.revenue, paymentMethod)
    : "";
  const reviewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    loadOptions("services", controller.signal)
      .then((rows) => {
        if (controller.signal.aborted) return;
        const catalogue = rows.map((row) => resourceSchemas.services.parse(row)).filter((row) => row.active);
        setServices(catalogue);
        if (existing) return;
        const lake = trip.payload.lake === "Lago di Como" ? "Como"
          : trip.payload.lake === "Lago Maggiore" ? "Maggiore" : null;
        const normalizeStop = (value: string) => value.trim().toLocaleLowerCase("it").replace(/[\s,]+/g, " ");
        const activities = supplierRequestServices(trip.payload.ids).map(({ id, title }) => ({
          title, rates: catalogue.filter((row) => row.experience_id === id),
        }));
        const stops = new Map((trip.payload.details?.stops ?? [])
          .filter((stop) => stop.trim())
          .map((stop) => [normalizeStop(stop), stop.trim()]));
        const requested = [...activities, ...Array.from(stops, ([name, title]) => ({
          title, rates: catalogue.filter((row) => row.experience_id === customExperienceService && normalizeStop(row.title) === name),
        }))].map(({ title, rates }) => {
          const localRates = lake ? rates.filter((row) => row.lake === lake) : [];
          const matches = localRates.length ? localRates : rates.filter((row) => row.lake === "Entrambi");
          if (matches.length !== 1) return quoteItem(title);
          const [row] = matches;
          const quantity = row.unit === "persona" ? trip.payload.details?.guests
            : row.unit === "ora" || row.unit === "giorno" ? undefined : 1;
          return {
            ...quoteItem(row.title), service_id: row.id, supplier_id: row.supplier_id,
            quantity: quantity ?? 1,
            cost_cents: row.cost_cents, price_cents: row.price_cents ?? 0,
            priceEntered: row.price_cents !== null && quantity !== undefined,
          };
        });
        if (requested.length) setItems((current) => current.some(keepQuoteRow) ? current : requested.slice(0, 30));
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          console.error("[experience-admin] Price list failed:", cause);
          if (!existing) {
            const requested = [
              ...supplierRequestServices(trip.payload.ids).map(({ title }) => title),
              ...(trip.payload.details?.stops ?? []).map((stop) => stop.trim()).filter(Boolean),
            ].slice(0, 30).map(quoteItem);
            if (requested.length)
              setItems((current) => current.some(keepQuoteRow) ? current : requested);
          }
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
  function removeItem(index: number) {
    setItems((current) => current.length === 1 ? [quoteItem()] : current.filter((_, row) => row !== index));
  }
  function update(
    index: number,
    field: keyof QuoteEditorItem,
    value: string | number | boolean | null,
  ) {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
    setReview(false);
  }
  function payload(publish: boolean) {
    if (!conditions.trim())
      throw new Error("Inserisca le condizioni del preventivo.");
    const link =
      paymentMethod && paymentMethod !== "bank" ? cardLink.trim() : "";
    if (link && !stripeQuoteUrl(link))
      throw new Error(
        "Inserisca un link di pagamento Stripe valido (buy.stripe.com).",
      );
    if (link && cardAmount !== totals.revenue)
      throw new Error(
        "Il totale è cambiato. Verifichi l’importo dell’acconto su Stripe e reinserisca il link aggiornato.",
      );
    return {
      action: "quote",
      data: {
        ...(existing?.id
          ? { id: existing.id, quote_version: existing.updated_at }
          : {}),
        trip_id: trip.id,
        trip_version: trip.updated_at,
        items: items.map(
          ({ included: _included, priceEntered: _priceEntered, ...item }) =>
            item,
        ),
        inclusions: includedServices,
        exclusions: lines(exclusions),
        conditions: combineQuoteConditions(conditions, payment, link),
        valid_until: validUntil ? new Date(validUntil).toISOString() : null,
        internal_notes: notes,
        publish,
      },
    };
  }
  async function save(publish: boolean) {
    setError("");
    if (items.some((item) => !item.priceEntered)) {
      setError(
        "Inserisca il prezzo cliente per ogni servizio. Indichi 0 solo se il servizio è offerto.",
      );
      return;
    }
    let data;
    try {
      data = payload(publish);
    } catch (cause) {
      setError(
        cause instanceof RangeError
          ? "Scadenza non valida."
          : (cause as Error).message,
      );
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
    } catch (cause) {
      setError(
        cause instanceof RangeError
          ? "Controlli la scadenza."
          : (cause as Error).message,
      );
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
            {trip.customer?.full_name || (trip.user_id ? "Cliente registrato" : "Cliente ospite")}
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
      <p aria-current="step" className="text-sm font-medium text-soft-black/75">
        {review ? "Passaggio 2 di 2 · Anteprima cliente" : "Passaggio 1 di 2 · Servizi, prezzi e condizioni"}
      </p>
      {!review ? (
        <>
          <section className={infoNotice} aria-label="Guida alla compilazione">
            <h3 className="font-semibold">Come preparare il preventivo</h3>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>I pacchetti e le tappe richiesti sono già nella bozza. Se il listino ha una tariffa compatibile e univoca, vengono compilati anche fornitore e prezzi disponibili.</li>
              <li>Verifica la quantità e il prezzo di ogni servizio.</li>
              <li>Indica condizioni, pagamento e scadenza, poi apri l’anteprima cliente.</li>
            </ul>
          </section>
          <h3 className="font-display text-2xl">Servizi e prezzi</h3>
          <p className="text-sm leading-6 text-soft-black/75">
            Il <strong>costo a noi</strong> è quanto paghi al fornitore e resta interno.
            Il <strong>prezzo cliente</strong> è quanto paga il cliente per una unità.
            Per esempio, 2 persone a 45 € ciascuna fanno 90 €.
          </p>
          {optionsError && <Alert>{optionsError}</Alert>}
          {suppliers.error && <Alert>{suppliers.error}</Alert>}
          {items.some(keepQuoteRow) && (
            <section aria-label="Servizi nel preventivo" className="space-y-2">
              <h4 className="font-semibold">Servizi nel preventivo</h4>
              <p className="text-sm text-soft-black/75">Usa il catalogo per aggiungere un servizio. Premi la × sulla card per toglierlo.</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item, index) => keepQuoteRow(item) && (
                  <article key={index} className="flex min-w-0 items-start justify-between gap-2 border border-pearl-grey bg-white p-3">
                    <div className="min-w-0 break-words">
                      <p className="font-medium">{item.label || "Servizio da definire"}</p>
                      <p className="text-sm">{item.priceEntered ? money(item.price_cents) + " per unità" : "Prezzo da verificare"}</p>
                    </div>
                    <button type="button" className={button} aria-label={`Rimuovi card ${item.label || index + 1}`}
                      onClick={() => removeItem(index)}>
                      <X size={16} aria-hidden="true" /> Rimuovi
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
          <QuoteServicePicker
            trip={trip}
            services={services}
            loading={loading}
            available={30 - items.filter(keepQuoteRow).length}
            onAdd={(selected) => {
              setItems((current) => [
                ...current.filter(keepQuoteRow),
                ...selected,
              ]);
            }}
          />
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
                  <label className="mt-2 block text-xs font-medium">
                    <span className="mb-1 block">
                      Fornitore <span className="font-normal">(interno)</span>
                    </span>
                    <select
                      className={cls}
                      disabled={suppliers.loading || Boolean(suppliers.error)}
                      value={item.supplier_id ?? ""}
                      onChange={(event) =>
                        update(index, "supplier_id", event.target.value || null)
                      }
                    >
                      <option value="">
                        {suppliers.loading ? "Caricamento…" : "Da assegnare"}
                      </option>
                      {item.supplier_id &&
                        !suppliers.suppliers.some(
                          (supplier) => supplier.id === item.supplier_id,
                        ) && (
                          <option value={item.supplier_id}>
                            Fornitore già assegnato
                          </option>
                        )}
                      {suppliers.suppliers
                        .filter(
                          (supplier) =>
                            supplier.status !== "inactive" ||
                            supplier.id === item.supplier_id,
                        )
                        .map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                            {supplier.status === "inactive"
                              ? " (non attivo)"
                              : ""}
                          </option>
                        ))}
                    </select>
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
                      placeholder="Da inserire"
                      value={item.priceEntered ? toEuro(item.price_cents) : ""}
                      onChange={(event) => {
                        const value = fromEuro(event.target.value);
                        update(index, "price_cents", value ?? 0);
                        update(index, "priceEntered", value !== null);
                      }}
                    />
                  </label>
                </div>
                <div role="cell" className="min-w-0 text-sm">
                  <span className="mb-2 block xl:sr-only">Totale cliente</span>
                  <output className="break-words text-base font-semibold tabular-nums">
                    {item.priceEntered
                      ? money(item.quantity * item.price_cents)
                      : "Da definire"}
                  </output>
                </div>
                <div role="cell" className="col-span-2 xl:col-span-1">
                  <button
                    type="button"
                    className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-sm border border-pearl-grey px-2 text-sm hover:border-gold-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-dark disabled:opacity-40"
                    aria-label={`Rimuovi voce ${index + 1}`}
                    disabled={!keepQuoteRow(item) && items.length === 1}
                    onClick={() => removeItem(index)}
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
            onClick={() => setItems((current) => [...current, quoteItem()])}
          >
            <Plus size={16} />
            Aggiungi servizio fuori listino
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
          <p className="text-sm text-soft-black/75">
            Spiega cosa comprende il prezzo, quali extra si pagano a parte e come funziona l’annullamento.
          </p>
          <fieldset className="space-y-3">
            <legend className="font-semibold">Servizi inclusi</legend>
            <p className="text-sm text-soft-black/75">
              Spunta i servizi da riportare tra le inclusioni. La spunta non
              modifica le righe di prezzo o il totale.
            </p>
            {items.some((item) => item.label.trim()) ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map(
                  (item, index) =>
                    item.label.trim() && (
                      <label
                        key={index}
                        className="flex min-h-12 items-center gap-3 border border-pearl-grey bg-warm-white px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 accent-gold-dark"
                          checked={item.included}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setItems((current) =>
                              current.map((row, i) =>
                                i === index
                                  ? { ...row, included: checked }
                                  : row,
                              ),
                            );
                          }}
                        />
                        <span className="min-w-0 break-words">
                          {item.label}
                        </span>
                      </label>
                    ),
                )}
              </div>
            ) : (
              <p className="text-sm">
                Aggiungi una riga di servizio per poterla selezionare qui.
              </p>
            )}
          </fieldset>
          <details
            open={Boolean(
              existing?.inclusions.some(
                (text) =>
                  !initial?.items.some((item) => item.label.trim() === text),
              ) || existing?.exclusions.length,
            )}
            className="space-y-3 border border-pearl-grey bg-warm-white p-4"
          >
            <summary className="min-h-10 cursor-pointer py-2 font-medium">
              Inclusioni aggiuntive ed esclusioni
            </summary>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Inclusioni aggiuntive · una voce per riga">
                <textarea
                  rows={3}
                  maxLength={15000}
                  value={additionalInclusions}
                  onChange={(e) => setAdditionalInclusions(e.target.value)}
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
          </details>
          <Field label="Condizioni visibili al cliente *">
            <textarea
              required
              rows={4}
              maxLength={3500}
              placeholder="Disponibilità, condizioni di annullamento, scadenza del saldo, variazioni e inclusioni fiscali."
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              className={cls}
            />
          </Field>
          <section className="space-y-4 border border-pearl-grey bg-warm-white p-4">
            <h4 className="font-semibold">Pagamento e acconto</h4>
            <p className={checkNotice}>
              Scegli come il cliente potrà versare il 50%. Questo passaggio
              aggiunge le istruzioni al preventivo, mentre l’incasso si verifica
              sul conto o su Stripe.
            </p>
            <Field label="Modalità di pagamento">
              <select
                className={cls}
                value={paymentMethod}
                onChange={(event) => {
                  setPaymentMethod(
                    event.target.value as QuotePaymentMethod | "",
                  );
                  if (event.target.value === "bank" || !event.target.value)
                    setCardLink("");
                }}
              >
                <option value="">Da concordare</option>
                {Object.entries(quotePaymentMethods).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            {payment && (
              <p className="whitespace-pre-line text-sm leading-6">{payment}</p>
            )}
            {paymentMethod && paymentMethod !== "bank" && (
              <Field label="Link Stripe dell’acconto (facoltativo)">
                <input
                  className={cls}
                  type="url"
                  maxLength={180}
                  placeholder="https://buy.stripe.com/…"
                  value={cardLink}
                  onChange={(event) => {
                    setCardLink(event.target.value);
                    setCardAmount(totals.revenue);
                  }}
                />
                <span className="block text-xs font-normal text-soft-black/70">
                  Verifichi su Stripe che il link corrisponda all’importo
                  dell’acconto. Il link compare solo nell’area cliente finché il
                  preventivo è valido.
                </span>
              </Field>
            )}
          </section>
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
          <section className={checkNotice} aria-label="Controlli prima dell’anteprima">
            <h4 className="font-semibold">Prima di aprire l’anteprima</h4>
            <ul className="mt-1 list-inside list-disc">
              <li>{items.every((item) => item.label.trim() && item.priceEntered) && totals.revenue > 0
                ? "Servizi e prezzi inseriti." : "Controlla che ogni riga abbia un nome e un prezzo e che il totale sia maggiore di zero."}</li>
              <li>{conditions.trim() ? "Condizioni inserite." : "Scrivi le condizioni da mostrare al cliente."}</li>
              <li>{validUntil && Date.parse(validUntil) > Date.now()
                ? "Scadenza futura impostata." : "Scegli una data e un orario di scadenza futuri."}</li>
            </ul>
          </section>
          {error && <Alert>{error}</Alert>}
          <p className="text-sm leading-6 text-soft-black/75">
            «Salva bozza riservata» conserva il lavoro nell’admin. Con
            «Apri anteprima cliente» controlli prezzi e condizioni come li vedrà il cliente.
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
              Apri anteprima cliente
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
          <div className="grid gap-4 border border-pearl-grey p-4 text-sm sm:grid-cols-2">
            <div>
              <h4 className="font-semibold">Emittente del preventivo</h4>
              <p className="mt-1">
                {experienceIssuer.name} · P. IVA {experienceIssuer.vat}
              </p>
              <p>{experienceIssuer.address}</p>
              <p>{experienceIssuer.email}</p>
            </div>
            <div className="min-w-0 break-words">
              <h4 className="font-semibold">Destinatario e programma</h4>
              <p className="mt-1">
                {trip.customer?.full_name || (trip.user_id ? "Cliente registrato" : "Cliente ospite")}
              </p>
              <p>
                {trip.title} · {trip.payload.lake}
              </p>
            </div>
          </div>
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
              {includedServices.map((text, index) => (
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
          {payment && (
            <div className="space-y-2 border border-pearl-grey bg-warm-white p-4">
              <h4 className="font-semibold">Pagamento e acconto</h4>
              <p className="whitespace-pre-line text-sm leading-6">{payment}</p>
              {cardLink && (
                <p className="text-sm">
                  Link carta disponibile nell’area cliente durante la validità
                  dell’offerta.
                </p>
              )}
            </div>
          )}
          <p className={checkNotice}>
            «Pubblica nell’area cliente» rende disponibile il preventivo e il
            PDF in «I miei viaggi» per chi ha un account. Dopo la pubblicazione puoi generare un link privato anche per un cliente ospite.
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
              className={confirmAction}
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

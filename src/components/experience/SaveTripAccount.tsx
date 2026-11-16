"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { createExperienceTranslator } from "@/lib/experience-i18n";
import {
  tripPayloadSchema,
  savedTripSchema,
  type SavedTripDraft,
  type TripPayload,
} from "@/lib/experience-trips";
import styles from "./experience.module.css";

type Props = {
  payload: TripPayload;
  active: SavedTripDraft | null;
  onActiveChange: (trip: SavedTripDraft | null) => void;
  getPayload: () => TripPayload;
  onLoad: (payload: TripPayload) => void;
  t: ReturnType<typeof createExperienceTranslator>;
};
export function SaveTripAccount({
  payload,
  getPayload,
  onLoad,
  t,
  active,
  onActiveChange,
}: Props) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const identityRef = useRef<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [authRetry, setAuthRetry] = useState(0);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const setActive = onActiveChange;
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [returnPath, setReturnPath] = useState("/experience#richiesta");
  useEffect(() => {
    let cancelled = false;
    const path = `/experience${window.location.search}#richiesta`;
    setReturnPath(path);
    function updateIdentity(id: string | null) {
      if (identityRef.current && identityRef.current !== id) {
        setActive(null);
        setTitle("");
        setMessage("");
        onLoad({ version: 1, ids: [], lake: "Da scegliere insieme" });
      }
      identityRef.current = id;
      setAuthenticated(!!id);
    }
    setAuthError(false);
    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (
          error &&
          error.name !== "AuthSessionMissingError" &&
          error.status !== 401
        ) {
          console.error(
            "[experience-account] Account verification failed:",
            error.name,
          );
          setAuthError(true);
          return;
        }
        updateIdentity(data.user?.id || null);
      })
      .catch((error) => {
        console.error(
          "[experience-account] Account verification failed:",
          error,
        );
        if (!cancelled) setAuthError(true);
      });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!cancelled) updateIdentity(session?.user.id || null);
      },
    );
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [supabase, authRetry, onLoad]);
  useEffect(() => {
    if (!authenticated) return;
    const id = new URL(window.location.href).searchParams.get("trip");
    if (!id) return;
    let cancelled = false;
    setBusy(true);
    fetch(`/api/experience/trips?id=${encodeURIComponent(id)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        const checked = savedTripSchema.safeParse(result.trips?.[0]);
        if (!checked.success) throw new Error("invalid_saved_trip");
        const trip = checked.data;
        if (!cancelled) {
          onLoad(trip.payload);
          setActive(trip);
          setTitle(trip.title);
          setMessage(t("Experience caricata dal suo account."));
          setFailed(false);
        }
      })
      .catch((error) => {
        console.error(
          "[experience-account] Could not load saved itinerary:",
          error.message,
        );
        if (!cancelled) {
          setFailed(true);
          setMessage(
            t(
              "Non è stato possibile caricare il viaggio. Acceda a Esperienze salvate oppure riprovi.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authenticated, onLoad, t]);
  async function save(asNew = false) {
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const response = await fetch("/api/experience/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(!asNew && active
            ? { id: active.id, updated_at: active.updated_at }
            : {}),
          title: title.trim() || t("La mia Experience sui laghi"),
          payload: tripPayloadSchema.parse(getPayload()),
        }),
      });
      const result = await response.json();
      if (response.status === 401) {
        setAuthenticated(false);
        throw new Error("auth_required");
      }
      if (!response.ok) throw new Error(result.error);
      const saved = savedTripSchema.parse(result.trip);
      setActive(saved);
      setTitle(saved.title);
      setMessage(
        t(
          "Viaggio salvato. Lo ritroverà in Esperienze salvate anche da un altro dispositivo.",
        ),
      );
    } catch (error) {
      const code = error instanceof Error ? error.message : "storage_error";
      console.error("[experience-account] Save failed:", code);
      setFailed(true);
      setMessage(
        code === "version_conflict"
          ? t(
              "Il viaggio è stato modificato da un altro dispositivo. Riapra la versione aggiornata da Esperienze salvate oppure salvi una nuova copia.",
            )
          : t(
              "Salvataggio non riuscito. La selezione resta in questa scheda: riprovi oppure ci contatti.",
            ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.accountSave}>
      {authError ? (
        <div role="alert">
          <p>
            {t(
              "Non è stato possibile verificare l’account. Riprovi per salvare il viaggio.",
            )}
          </p>
          <button
            type="button"
            onClick={() => setAuthRetry((value) => value + 1)}
          >
            {t("Riprovi")}
          </button>
        </div>
      ) : authenticated === null ? (
        <p role="status">{t("Verifica dell’account…")}</p>
      ) : authenticated ? (
        <>
          <label>
            {t("Nome della sua Experience")}
            <input
              name="tripTitle"
              autoComplete="off"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              placeholder={t("La mia Experience sui laghi")}
            />
          </label>
          <button
            type="button"
            disabled={busy || !payload.ids.length}
            onClick={() => save()}
          >
            {busy
              ? t("Salvataggio in corso…")
              : active
                ? t("Salvi le modifiche")
                : t("Salvi nel suo account")}
          </button>
          {active && (
            <button type="button" disabled={busy} onClick={() => save(true)}>
              {t("Salvi come nuovo viaggio")}
            </button>
          )}
          <Link href="/account/viaggi">{t("Esperienze salvate")}</Link>
        </>
      ) : (
        <>
          <p>
            {t(
              "Acceda al suo account per salvare le esperienze selezionate e ritrovarle anche da un altro dispositivo.",
            )}
          </p>
          <p className={styles.accountOptional}>
            {t("Può inviare la richiesta anche senza creare un account.")}
          </p>
          <div className={styles.accountActions}>
            <Link href={`/login?redirect=${encodeURIComponent(returnPath)}`}>
              {t("Acceda al suo account")}
            </Link>
            <Link
              href={`/registrati?redirect=${encodeURIComponent(returnPath)}`}
            >
              {t("Crei un account")}
            </Link>
          </div>
        </>
      )}
      {message && <p role={failed ? "alert" : "status"}>{message}</p>}
    </div>
  );
}

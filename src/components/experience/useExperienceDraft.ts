"use client";

import { useCallback, useEffect, useState, type SetStateAction } from "react";
import { EXPERIENCE_DRAFT_KEY, type TripPayload } from "@/lib/experience-trips";

type Option = { id: string; value: string };
const STORAGE_KEY = EXPERIENCE_DRAFT_KEY;
const DESTINATIONS = [
  "Da scegliere insieme",
  "Lago di Como",
  "Lago Maggiore",
  "Entrambi i laghi",
];

// Only activity identifiers and destination are retained in the current tab.
// Contact details, dates, hotel, notes and budget never enter this store.
export function useExperienceDraft(options: readonly Option[]) {
  const [ids, setIds] = useState<string[]>([]);
  const [lake, setLake] = useState("Da scegliere insieme");
  const [ready, setReady] = useState(false);
  const [draftWarning, setDraftWarning] = useState<"restore" | "save" | null>(
    null,
  );

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (
          draft.version !== 1 ||
          !Array.isArray(draft.ids) ||
          draft.ids.length > options.length ||
          !draft.ids.every((id: unknown) => typeof id === "string") ||
          !DESTINATIONS.includes(draft.lake)
        ) {
          throw new Error("Invalid saved Experience selection");
        }
        const known = draft.ids.filter((id: string) =>
          options.some((option) => option.id === id),
        );
        if (known.length !== draft.ids.length)
          console.warn(
            "[experience-draft] Retired activity identifiers were removed.",
          );
        setIds([...new Set<string>(known)]);
        setLake(draft.lake);
      }
    } catch (error) {
      setDraftWarning("restore");
      console.warn(
        "[experience-draft] Selection could not be restored:",
        error,
      );
    }
    setReady(true);
  }, [options]);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, ids, lake }),
      );
    } catch (error) {
      setDraftWarning("save");
      console.warn(
        "[experience-draft] Selection could not be saved in this tab:",
        error,
      );
    }
  }, [ids, lake, ready]);

  const setInterests = useCallback(
    (action: SetStateAction<string[]>) => {
      setIds((current) => {
        const values = current.map(
          (id) => options.find((option) => option.id === id)!.value,
        );
        const next = typeof action === "function" ? action(values) : action;
        const nextIds = [
          ...new Set(
            next.map((value) => {
              const option = options.find(
                (candidate) => candidate.value === value,
              );
              if (!option)
                throw new Error(
                  `[experience-draft] Unknown selection: ${value}`,
                );
              return option.id;
            }),
          ),
        ];
        return nextIds.some((id) => id.startsWith("boat:"))
          ? nextIds.filter((id) => id !== "activity:boat")
          : nextIds;
      });
    },
    [options],
  );

  const loadDraft = useCallback((payload: TripPayload) => {
    setIds(payload.ids);
    setLake(payload.lake);
  }, []);
  return {
    payload: {
      version: 1,
      ids,
      lake: lake as TripPayload["lake"],
    } as TripPayload,
    loadDraft,
    draftWarning,
    interests: ids.map(
      (id) => options.find((option) => option.id === id)!.value,
    ),
    setInterests,
    lake,
    setLake,
  };
}

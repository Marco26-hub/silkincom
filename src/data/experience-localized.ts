import "server-only";
import {
  EXPERIENCES,
  EXPERIENCE_CATEGORIES,
  BOAT_PACKAGES,
  JOURNEYS,
  LOGISTICS,
  FAQ,
  type ExperienceContent,
} from "./experience-content";
import { createExperienceTranslator } from "@/lib/experience-i18n";
import uiSources from "../../messages/experience/ui-source.json";

const loaders = {
  it: () => import("../../messages/experience/it.json"),
  en: () => import("../../messages/experience/en.json"),
  es: () => import("../../messages/experience/es.json"),
  fr: () => import("../../messages/experience/fr.json"),
  de: () => import("../../messages/experience/de.json"),
  pt: () => import("../../messages/experience/pt.json"),
  nl: () => import("../../messages/experience/nl.json"),
};
const humanFields = new Set([
  "label",
  "description",
  "title",
  "location",
  "summary",
  "detail",
  "format",
  "audience",
  "subtitle",
  "stops",
  "features",
]);

export async function getExperienceLocale(locale: string) {
  if (!(locale in loaders))
    throw new Error(`Unsupported Experience locale: ${locale}`);
  const dictionary = (await loaders[locale as keyof typeof loaders]())
    .default as Record<string, string>;
  const t = createExperienceTranslator(locale, dictionary);
  function localize(value: unknown, key = "", all = false): unknown {
    if (typeof value === "string")
      return all || humanFields.has(key) ? t(value) : value;
    if (Array.isArray(value))
      return value.map((item) => localize(item, key, all));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([name, item]) => [
          name,
          localize(item, name, all),
        ]),
      );
    return value;
  }
  const content = localize({
    EXPERIENCE_CATEGORIES,
    EXPERIENCES,
    BOAT_PACKAGES,
    JOURNEYS,
    LOGISTICS,
  }) as ExperienceContent;
  content.FAQ = localize(FAQ, "", true) as typeof FAQ;
  const copy = Object.fromEntries(
    uiSources.map((source) => [source, t(source)]),
  );
  return { content, copy, t };
}

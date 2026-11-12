export type ExperienceTranslator = (
  source: string,
  values?: Record<string, string | number>,
) => string;

export function createExperienceTranslator(
  locale: string,
  dictionary: Record<string, string>,
): ExperienceTranslator {
  return (source, values = {}) => {
    const key = source.trim();
    const translated = locale === "it" ? key : dictionary[key];
    if (translated === undefined) {
      console.error(`[experience-i18n] Missing ${locale} translation: ${key}`);
      throw new Error(`Missing Experience translation (${locale})`);
    }
    const leading = source.match(/^\s*/)?.[0] ?? "";
    const trailing = source.match(/\s*$/)?.[0] ?? "";
    return (
      leading +
      translated.replace(/\{(\w+)\}/g, (match, name) =>
        name in values ? String(values[name]) : match,
      ) +
      trailing
    );
  };
}

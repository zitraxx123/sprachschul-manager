/**
 * Terminology by type of institution. The translation files are written for a language school;
 * for other types the word "language school" is replaced when the messages are loaded.
 * Other nouns (Kurs, Schüler, Lehrkraft / course, student, teacher) fit all supported types.
 */

export const ORG_TYPES = ["language_school", "dance_school", "music_school", "other"] as const;
export type OrgType = (typeof ORG_TYPES)[number];

export function isOrgType(value: unknown): value is OrgType {
  return typeof value === "string" && (ORG_TYPES as readonly string[]).includes(value);
}

type Locale = "de" | "en" | "ru";

const DE: Record<OrgType, string> = {
  language_school: "Sprachschul",
  dance_school: "Tanzschul",
  music_school: "Musikschul",
  other: "Schul",
};
const EN: Record<OrgType, string> = {
  language_school: "language school",
  dance_school: "dance school",
  music_school: "music school",
  other: "school",
};
// Russian: "школа танцев" keeps the dependent noun in the genitive for every case of "школа".
const RU_SUFFIX: Record<OrgType, string> = {
  language_school: "",
  dance_school: " танцев",
  music_school: " музыки",
  other: "",
};

function replaceText(text: string, locale: Locale, type: OrgType): string {
  if (type === "language_school") return text;
  if (locale === "de") {
    // "Sprachschule(n)" but not the product name "Sprachschul-Manager"
    return text.replace(/Sprachschul(e|en)\b/g, `${DE[type]}$1`);
  }
  if (locale === "en") {
    const lower = EN[type];
    const title = lower.replace(/\b\w/g, (c) => c.toUpperCase());
    return text
      .replace(/language school/g, lower)
      .replace(/Language School/g, title)
      .replace(/language academy/gi, (m) => (m[0] === "L" ? (type === "other" ? "Academy" : title.replace("School", "Academy")) : lower.replace("school", "academy")));
  }
  // ru: "языковая школа", "языковой школы", "языковую школу" ...
  return text.replace(/([Яя])зыков[а-яё]{2,3} школ([а-яё]{1,2})/g, (_m, first: string, ending: string) => {
    const s = first === "Я" ? "Ш" : "ш";
    return `${s}кол${ending}${RU_SUFFIX[type]}`;
  });
}

/** Keys starting with "orgType" are the type names themselves and are never rewritten. */
function walk<T>(value: T, locale: Locale, type: OrgType): T {
  if (typeof value === "string") return replaceText(value, locale, type) as T;
  if (Array.isArray(value)) return value.map((v) => walk(v, locale, type)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, k.startsWith("orgType") ? v : walk(v, locale, type)])
    ) as T;
  }
  return value;
}

// Cache per messages object (the loaded JSON module is the same object on every request)
const cache = new WeakMap<object, Map<string, unknown>>();

export function applyTerminology<T>(messages: T, locale: Locale, type: OrgType): T {
  if (type === "language_school" || !messages || typeof messages !== "object") return messages;
  let perMessages = cache.get(messages as object);
  if (!perMessages) {
    perMessages = new Map();
    cache.set(messages as object, perMessages);
  }
  const key = `${locale}:${type}`;
  if (!perMessages.has(key)) perMessages.set(key, walk(messages, locale, type));
  return perMessages.get(key) as T;
}

import { createTranslator } from "next-intl";
import de from "../../messages/de.json";

/**
 * Legal documents (Rechnung, Mahnung, Bescheinigung) are addressed to German customers and are always
 * printed in German, whatever language the administrator uses in the interface.
 */
export const DOCUMENT_LOCALE = "de" as const;

type Messages = typeof de;

export function getDocumentTranslator<N extends keyof Messages & string>(namespace: N) {
  return createTranslator({
    locale: DOCUMENT_LOCALE,
    messages: de as unknown as Record<string, unknown>,
    namespace,
  }) as unknown as (key: string, values?: Record<string, string | number>) => string;
}

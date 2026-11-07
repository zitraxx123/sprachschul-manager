import { describe, expect, it } from "vitest";
import { DOCUMENT_LOCALE, getDocumentTranslator } from "@/lib/document-translations";
import de from "../../../messages/de.json";

describe("document translations", () => {
  it("always uses German for legal documents", () => {
    expect(DOCUMENT_LOCALE).toBe("de");
    const t = getDocumentTranslator("invoices");
    expect(t("docTitle")).toBe("Rechnung");
    expect(t("docTitle")).toBe(de.invoices.docTitle);
  });

  it("fills in placeholders", () => {
    const t = getDocumentTranslator("invoices");
    expect(t("docPayText", { date: "01.12.2026" })).toContain("01.12.2026");
  });
});

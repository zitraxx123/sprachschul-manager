import { describe, it, expect } from "vitest";
import {
  sepaText, isValidIban, normalizeIban, normalizeBic, isValidCreditorId, isValidMandateRef, buildDirectDebitXml,
} from "@/lib/sepa";

describe("sepa helpers", () => {
  it("transliterates umlauts and strips forbidden characters", () => {
    expect(sepaText("Müller & Söhne ß", 70)).toBe("Mueller Soehne ss");
    expect(sepaText("abcdef", 3)).toBe("abc");
  });
  it("validates IBANs with mod-97", () => {
    expect(isValidIban("DE89 3704 0044 0532 0130 00")).toBe(true);
    expect(isValidIban("DE89370400440532013001")).toBe(false);
    expect(isValidIban("garbage")).toBe(false);
    expect(normalizeIban(" de89 3704 ")).toBe("DE893704");
  });
  it("validates BIC, creditor id, mandate ref", () => {
    expect(normalizeBic("cobadeff xxx")).toBe("COBADEFFXXX");
    expect(normalizeBic("bad")).toBeNull();
    expect(isValidCreditorId("DE98ZZZ09999999999")).toBe(true);
    expect(isValidCreditorId("123")).toBe(false);
    expect(isValidMandateRef("MANDAT-001")).toBe(true);
    expect(isValidMandateRef("")).toBe(false);
    expect(isValidMandateRef("x".repeat(36))).toBe(false);
  });
});

describe("buildDirectDebitXml", () => {
  const base = {
    creditor: { name: "Schule & Co", iban: "DE89370400440532013000", creditorId: "DE98ZZZ09999999999" },
    collectionDate: "2026-12-01",
    messageId: "MSG1",
    createdAt: new Date("2026-11-03T10:00:00.123Z"),
  };
  const tx = (id: string, amount: number, sequence: "FRST" | "RCUR") => ({
    endToEndId: id, amount, mandateId: "M1", mandateDate: "2026-01-01", debtorName: "Max Müller",
    debtorIban: "DE89370400440532013000", remittance: "Beitrag", sequence,
  });

  it("sums per group and in header, without float drift", () => {
    const xml = buildDirectDebitXml({ ...base, transactions: [tx("a", 0.1, "FRST"), tx("b", 0.2, "FRST"), tx("c", 10.5, "RCUR")] });
    expect(xml).toContain("<NbOfTxs>3</NbOfTxs>");
    expect(xml).toContain("<CtrlSum>10.80</CtrlSum>");
    expect(xml).toContain("<CtrlSum>0.30</CtrlSum>");
    expect(xml).toContain("<SeqTp>FRST</SeqTp>");
    expect(xml).toContain("<SeqTp>RCUR</SeqTp>");
    expect(xml).toContain("<CreDtTm>2026-11-03T10:00:00</CreDtTm>");
  });
  it("uses the SEPA charset and omits empty sequence groups", () => {
    const xml = buildDirectDebitXml({ ...base, transactions: [tx("a", 5, "RCUR")] });
    expect(xml).toContain("Schule Co"); // '&' is not in the SEPA charset and gets removed
    expect(xml).not.toContain("<SeqTp>FRST</SeqTp>");
    expect(xml).toContain("Mueller");
    expect(xml).toContain("<Othr><Id>NOTPROVIDED</Id></Othr>");
  });
});

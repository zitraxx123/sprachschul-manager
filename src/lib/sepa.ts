/** SEPA Core direct debit (pain.008.001.02) helpers. Pure functions, no I/O. */

export type SepaSequence = "FRST" | "RCUR";

const UMLAUTS: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss" };

/** Reduces text to the SEPA character set (a-z A-Z 0-9 / - ? : ( ) . , ' + space) and cuts it to max length. */
export function sepaText(input: string, max: number): string {
  return (input || "")
    .replace(/[äöüÄÖÜß]/g, (c) => UMLAUTS[c])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 /\-?:().,'+]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function normalizeIban(iban: string): string {
  return (iban || "").replace(/\s+/g, "").toUpperCase();
}

/** Format check plus ISO 7064 mod-97 checksum. */
export function isValidIban(iban: string): boolean {
  const s = normalizeIban(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    const v = ch >= "A" ? ch.charCodeAt(0) - 55 : Number(ch);
    rem = (rem * (v > 9 ? 100 : 10) + v) % 97;
  }
  return rem === 1;
}

export function normalizeBic(bic: string | null | undefined): string | null {
  const s = (bic || "").replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(s) ? s : null;
}

/** Creditor identifier (Gläubiger-ID), e.g. DE98ZZZ09999999999 */
export function normalizeCreditorId(id: string): string {
  return (id || "").replace(/\s+/g, "").toUpperCase();
}
export function isValidCreditorId(id: string): boolean {
  return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{3}[A-Z0-9]{1,28}$/.test(normalizeCreditorId(id));
}

/** Mandate reference: 1-35 chars from the SEPA character set. */
export function isValidMandateRef(ref: string): boolean {
  return /^[A-Za-z0-9+?/:().,' -]{1,35}$/.test(ref || "");
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export interface SepaCreditor {
  name: string;
  iban: string;
  bic?: string | null;
  creditorId: string;
}

export interface SepaTransaction {
  endToEndId: string;
  amount: number;
  mandateId: string;
  mandateDate: string; // YYYY-MM-DD
  debtorName: string;
  debtorIban: string;
  debtorBic?: string | null;
  remittance: string;
  sequence: SepaSequence;
}

const money = (n: number) => (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);

export function buildDirectDebitXml(params: {
  creditor: SepaCreditor;
  collectionDate: string; // YYYY-MM-DD
  transactions: SepaTransaction[];
  messageId: string;
  createdAt: Date;
}): string {
  const { creditor, collectionDate, transactions, messageId, createdAt } = params;
  const msgId = sepaText(messageId, 35);
  const creditorName = esc(sepaText(creditor.name, 70));
  const creditorBic = normalizeBic(creditor.bic);
  const total = transactions.reduce((s, t) => s + Math.round(t.amount * 100), 0) / 100;
  const created = createdAt.toISOString().replace(/\.\d{3}Z$/, "");

  const groups = (["FRST", "RCUR"] as SepaSequence[])
    .map((seq) => ({ seq, items: transactions.filter((t) => t.sequence === seq) }))
    .filter((g) => g.items.length > 0);

  const pmtInf = groups
    .map(({ seq, items }) => {
      const sum = items.reduce((s, t) => s + Math.round(t.amount * 100), 0) / 100;
      const txs = items
        .map((t) => {
          const dBic = normalizeBic(t.debtorBic);
          return `      <DrctDbtTxInf>
        <PmtId><EndToEndId>${esc(sepaText(t.endToEndId, 35) || "NOTPROVIDED")}</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">${money(t.amount)}</InstdAmt>
        <DrctDbtTx><MndtRltdInf><MndtId>${esc(t.mandateId)}</MndtId><DtOfSgntr>${t.mandateDate}</DtOfSgntr></MndtRltdInf></DrctDbtTx>
        <DbtrAgt><FinInstnId>${dBic ? `<BIC>${dBic}</BIC>` : `<Othr><Id>NOTPROVIDED</Id></Othr>`}</FinInstnId></DbtrAgt>
        <Dbtr><Nm>${esc(sepaText(t.debtorName, 70))}</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>${normalizeIban(t.debtorIban)}</IBAN></Id></DbtrAcct>
        <RmtInf><Ustrd>${esc(sepaText(t.remittance, 140))}</Ustrd></RmtInf>
      </DrctDbtTxInf>`;
        })
        .join("\n");

      return `    <PmtInf>
      <PmtInfId>${esc(sepaText(`${msgId}-${seq}`, 35))}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${items.length}</NbOfTxs>
      <CtrlSum>${money(sum)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl><LclInstrm><Cd>CORE</Cd></LclInstrm><SeqTp>${seq}</SeqTp></PmtTpInf>
      <ReqdColltnDt>${collectionDate}</ReqdColltnDt>
      <Cdtr><Nm>${creditorName}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${normalizeIban(creditor.iban)}</IBAN></Id></CdtrAcct>
      <CdtrAgt><FinInstnId>${creditorBic ? `<BIC>${creditorBic}</BIC>` : `<Othr><Id>NOTPROVIDED</Id></Othr>`}</FinInstnId></CdtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId><Id><PrvtId><Othr><Id>${normalizeCreditorId(creditor.creditorId)}</Id><SchmeNm><Prtry>SEPA</Prtry></SchmeNm></Othr></PrvtId></Id></CdtrSchmeId>
${txs}
    </PmtInf>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${esc(msgId)}</MsgId>
      <CreDtTm>${created}</CreDtTm>
      <NbOfTxs>${transactions.length}</NbOfTxs>
      <CtrlSum>${money(total)}</CtrlSum>
      <InitgPty><Nm>${creditorName}</Nm></InitgPty>
    </GrpHdr>
${pmtInf}
  </CstmrDrctDbtInitn>
</Document>
`;
}

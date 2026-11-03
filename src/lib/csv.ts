/** CSV for German Excel / tax advisors: semicolon separated, decimal comma, UTF-8 with BOM. */

export type CsvCell = string | number | null | undefined;

/** 1234.5 -> "1234,50" */
export function csvMoney(n: number | string | null | undefined): string {
  const v = Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
  return v.toFixed(2).replace(".", ",");
}

/** 2026-11-03 -> "03.11.2026" */
export function csvDate(d: string | null | undefined): string {
  if (!d) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : d;
}

function escapeCell(value: CsvCell): string {
  let s = value === null || value === undefined ? "" : String(value);
  // Neutralise spreadsheet formula injection (text starting with = + - @ would be executed by Excel)
  if (/^[=+@]/.test(s) || (/^-/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s))) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: CsvCell[][]): string {
  const lines = [header, ...rows].map((r) => r.map(escapeCell).join(";"));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

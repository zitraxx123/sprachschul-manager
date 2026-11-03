import { describe, it, expect } from "vitest";
import { toCsv, csvMoney, csvDate } from "@/lib/csv";

describe("csv helpers", () => {
  it("formats money with decimal comma and date as DD.MM.YYYY", () => {
    expect(csvMoney(1234.5)).toBe("1234,50");
    expect(csvMoney("0.1")).toBe("0,10");
    expect(csvMoney(null)).toBe("0,00");
    expect(csvDate("2026-11-03")).toBe("03.11.2026");
    expect(csvDate(null)).toBe("");
  });
  it("quotes cells with separators, quotes and line breaks", () => {
    const csv = toCsv(["a", "b"], [['x;y', 'say "hi"'], ["line\nbreak", 1]]);
    expect(csv).toBe('﻿a;b\r\n"x;y";"say ""hi"""\r\n"line\nbreak";1\r\n');
  });
  it("neutralises formula injection but keeps negative numbers", () => {
    const csv = toCsv(["v"], [["=SUM(A1)"], ["-5,00"], ["-cmd"], ["@x"]]);
    expect(csv).toContain("\r\n'=SUM(A1)\r\n");
    expect(csv).toContain("\r\n-5,00\r\n");
    expect(csv).toContain("\r\n'-cmd\r\n");
    expect(csv).toContain("\r\n'@x\r\n");
  });
});

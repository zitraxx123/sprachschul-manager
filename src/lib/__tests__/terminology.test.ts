import { describe, it, expect } from "vitest";
import { applyTerminology, isOrgType } from "@/lib/terminology";

const de = { a: "Name Ihrer Sprachschule", b: "Sprachschul-Manager", c: "Meine Sprachschule", n: { d: "z. B. Sprachschule Berlin" } };
const en = { a: "your language school", b: "Language School Name", c: "Language School & Education" };
const ru = { a: "Менеджер языковой школы", b: "Моя языковая школа", c: "Регистрация языковой школы", d: "Название языковой школы", e: "в языковую школу" };

describe("applyTerminology", () => {
  it("leaves language schools untouched", () => {
    expect(applyTerminology(de, "de", "language_school")).toBe(de);
  });
  it("replaces the school noun in German but keeps the product name", () => {
    const r = applyTerminology(de, "de", "dance_school");
    expect(r.a).toBe("Name Ihrer Tanzschule");
    expect(r.b).toBe("Sprachschul-Manager");
    expect(r.n.d).toBe("z. B. Tanzschule Berlin");
    expect(applyTerminology(de, "de", "other").c).toBe("Meine Schule");
    expect(applyTerminology(de, "de", "music_school").c).toBe("Meine Musikschule");
  });
  it("replaces the school noun in English with correct case", () => {
    const r = applyTerminology(en, "en", "dance_school");
    expect(r.a).toBe("your dance school");
    expect(r.b).toBe("Dance School Name");
    expect(applyTerminology(en, "en", "other").c).toBe("School & Education");
  });
  it("replaces the school noun in Russian for each case", () => {
    const r = applyTerminology(ru, "ru", "dance_school");
    expect(r.a).toBe("Менеджер школы танцев");
    expect(r.b).toBe("Моя школа танцев");
    expect(r.c).toBe("Регистрация школы танцев");
    expect(r.e).toBe("в школу танцев");
    expect(applyTerminology(ru, "ru", "other").d).toBe("Название школы");
  });
  it("never rewrites the type names themselves", () => {
    const r = applyTerminology({ orgTypeLanguage: "Sprachschule", x: "Sprachschule" }, "de", "dance_school");
    expect(r.orgTypeLanguage).toBe("Sprachschule");
    expect(r.x).toBe("Tanzschule");
  });
  it("validates org types", () => {
    expect(isOrgType("dance_school")).toBe(true);
    expect(isOrgType("zoo")).toBe(false);
  });
});

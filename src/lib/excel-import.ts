import * as XLSX from "xlsx";

export interface TeacherImportRow {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  hourlyRate?: number;
}

export interface CourseImportRow {
  courseName: string;
  teacherEmail?: string;
  dayOfWeek?: string;
  startTime?: string;
  duration?: number;
  roomName?: string;
}

export interface StudentImportRow {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  courseName?: string;
}

export interface ParsedImportData {
  mode: "multi_sheet" | "single_csv";
  fileName: string;
  teachers: TeacherImportRow[];
  courses: CourseImportRow[];
  students: StudentImportRow[];
  warnings: string[];
}

/**
 * Downloads a pre-formatted Excel template (.xlsx) with 3 sheets:
 * Sheet 1: Lehrer
 * Sheet 2: Kurse
 * Sheet 3: Schueler
 */
export function downloadImportTemplateXlsx() {
  const wb = XLSX.utils.book_new();

  // 1. Lehrer Sheet
  const lehrerHeaders = ["Vorname", "Nachname", "Email", "Telefon", "Stundensatz"];
  const lehrerRows = [
    lehrerHeaders,
    ["Anna", "Schmidt", "anna.schmidt@beispiel.de", "+49 170 1234567", 35],
    ["Max", "Mustermann", "max.mustermann@beispiel.de", "+49 171 9876543", 40],
    ["Elena", "Weber", "elena.weber@beispiel.de", "+49 172 5554321", 38],
  ];
  const wsLehrer = XLSX.utils.aoa_to_sheet(lehrerRows);
  wsLehrer["!cols"] = [
    { wch: 16 }, // Vorname
    { wch: 18 }, // Nachname
    { wch: 32 }, // Email
    { wch: 20 }, // Telefon
    { wch: 16 }, // Stundensatz
  ];
  XLSX.utils.book_append_sheet(wb, wsLehrer, "Lehrer");

  // 2. Kurse Sheet
  const kurseHeaders = ["Kursname", "Lehrer_Email", "Wochentag", "Uhrzeit", "Dauer", "Raum"];
  const kurseRows = [
    kurseHeaders,
    ["Deutsch A1 Intensiv", "anna.schmidt@beispiel.de", "Montag", "18:00", 1.5, "Raum 1"],
    ["Englisch B2 Business", "max.mustermann@beispiel.de", "Dienstag", "19:00", 1.0, "Raum 2"],
    ["Spanisch A2 Konversation", "elena.weber@beispiel.de", "Mittwoch", "17:30", 1.5, "Raum 3"],
  ];
  const wsKurse = XLSX.utils.aoa_to_sheet(kurseRows);
  wsKurse["!cols"] = [
    { wch: 28 }, // Kursname
    { wch: 32 }, // Lehrer_Email
    { wch: 15 }, // Wochentag
    { wch: 12 }, // Uhrzeit
    { wch: 12 }, // Dauer (Std. oder Min.)
    { wch: 16 }, // Raum
  ];
  XLSX.utils.book_append_sheet(wb, wsKurse, "Kurse");

  // 3. Schueler Sheet
  const schuelerHeaders = ["Vorname", "Nachname", "Elternname", "Eltern_Telefon", "Kursname"];
  const schuelerRows = [
    schuelerHeaders,
    ["Leon", "Mueller", "Sabine Mueller", "+49 172 1112233", "Deutsch A1 Intensiv"],
    ["Sophie", "Schneider", "Thomas Schneider", "+49 173 4445566", "Englisch B2 Business"],
    ["Lukas", "Fischer", "Maria Fischer", "+49 174 7778899", "Deutsch A1 Intensiv"],
    ["Mia", "Wagner", "Julia Wagner", "+49 175 3332211", "Spanisch A2 Konversation"],
  ];
  const wsSchueler = XLSX.utils.aoa_to_sheet(schuelerRows);
  wsSchueler["!cols"] = [
    { wch: 16 }, // Vorname
    { wch: 18 }, // Nachname
    { wch: 24 }, // Elternname
    { wch: 20 }, // Eltern_Telefon
    { wch: 28 }, // Kursname
  ];
  XLSX.utils.book_append_sheet(wb, wsSchueler, "Schueler");

  // Trigger browser download
  XLSX.writeFile(wb, "sprachschule_import_vorlage.xlsx");
}

/**
 * Normalizes time string from various formats (string "18:00", "18.00", Excel serial number 0.75, etc.)
 */
export function normalizeTimeString(val: unknown): string {
  if (val === null || val === undefined || val === "") return "18:00";

  if (typeof val === "number") {
    // Excel time fraction (0.75 -> 18:00)
    if (val >= 0 && val < 1) {
      const totalMinutes = Math.round(val * 24 * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
    // Integer hour like 18 or 9
    if (val >= 1 && val <= 24) {
      return `${String(Math.floor(val)).padStart(2, "0")}:00`;
    }
  }

  const str = String(val).trim().replace(".", ":");
  const timeMatch = str.match(/^(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2], 10);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  return "18:00";
}

/**
 * Normalizes duration to decimal hours:
 * If >= 15 (e.g. 45, 60, 90 min) -> converts to 0.75, 1.0, 1.5
 * Otherwise treats as hours (e.g. 1.5, 2, 0.75)
 */
export function normalizeDuration(val: unknown): number {
  if (val === null || val === undefined || val === "") return 1.0;
  if (typeof val === "number") {
    if (val >= 15) return Math.round((val / 60) * 100) / 100;
    return val > 0 ? val : 1.0;
  }
  const clean = String(val).replace(",", ".").replace(/[^0-9.]/g, "");
  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) return 1.0;
  if (num >= 15) return Math.round((num / 60) * 100) / 100;
  return num;
}

/**
 * Normalizes day of week to standard German name:
 * "Mo" / "montag" -> "Montag"
 */
export function normalizeDayOfWeek(val: unknown): string {
  if (!val) return "Montag";
  const s = String(val).trim().toLowerCase();
  if (s.startsWith("mo")) return "Montag";
  if (s.startsWith("di")) return "Dienstag";
  if (s.startsWith("mi")) return "Mittwoch";
  if (s.startsWith("do")) return "Donnerstag";
  if (s.startsWith("fr")) return "Freitag";
  if (s.startsWith("sa")) return "Samstag";
  if (s.startsWith("so")) return "Sonntag";

  // Capitalize first letter as fallback
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Normalizes hourly rate
 */
export function normalizeHourlyRate(val: unknown): number {
  if (val === null || val === undefined || val === "") return 35;
  if (typeof val === "number") return val >= 0 ? val : 35;
  const clean = String(val).replace(",", ".").replace(/[^0-9.]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) || num < 0 ? 35 : num;
}

/**
 * Helper to match object key case-insensitively against multiple regex patterns
 */
function findKeyValue(row: Record<string, unknown>, patterns: RegExp[]): unknown {
  for (const key of Object.keys(row)) {
    const cleanKey = key.trim().toLowerCase();
    for (const pat of patterns) {
      if (pat.test(cleanKey)) {
        return row[key];
      }
    }
  }
  return undefined;
}

/**
 * Parse an uploaded .xlsx or .csv file into structured data
 */
export async function parseImportFile(file: File): Promise<ParsedImportData> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  const sheetNames = workbook.SheetNames;
  const warnings: string[] = [];

  // Check for 3-sheet mode
  const lehrerSheetName = sheetNames.find((s) => /lehrer|teacher|dozent/i.test(s));
  const kurseSheetName = sheetNames.find((s) => /kurs|course/i.test(s));
  const schuelerSheetName = sheetNames.find((s) => /schueler|schüler|student/i.test(s));

  const isMultiSheet = Boolean(lehrerSheetName || kurseSheetName || (sheetNames.length >= 3 && schuelerSheetName));

  if (isMultiSheet) {
    // 1. Parse Lehrer sheet
    const teachers: TeacherImportRow[] = [];
    const tSheetName = lehrerSheetName || sheetNames[0];
    if (tSheetName && workbook.Sheets[tSheetName]) {
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[tSheetName], { defval: "" });
      for (const row of rawRows) {
        const vorname = String(findKeyValue(row, [/^vorname$/, /first.*name/i]) || "").trim();
        const nachname = String(findKeyValue(row, [/^nachname$/, /last.*name/i, /familienname/i]) || "").trim();
        const email = String(findKeyValue(row, [/^email$/, /^e-mail$/, /mail/i]) || "").trim().toLowerCase();
        const telefon = String(findKeyValue(row, [/^telefon$/, /^phone$/, /^tel$/, /^handy$/]) || "").trim();
        const stundensatzRaw = findKeyValue(row, [/^stundensatz$/, /^honorar$/, /hourly.*rate/i, /^rate$/]);

        if (vorname || nachname) {
          teachers.push({
            firstName: vorname || nachname,
            lastName: vorname ? nachname : "",
            email: email || undefined,
            phone: telefon || undefined,
            hourlyRate: normalizeHourlyRate(stundensatzRaw),
          });
        }
      }
    }

    // 2. Parse Kurse sheet
    const courses: CourseImportRow[] = [];
    const cSheetName = kurseSheetName || (sheetNames.length > 1 ? sheetNames[1] : undefined);
    if (cSheetName && workbook.Sheets[cSheetName]) {
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[cSheetName], { defval: "" });
      for (const row of rawRows) {
        const kursname = String(findKeyValue(row, [/^kursname$/, /^kurs$/, /^course$/, /^fach$/]) || "").trim();
        const lehrerEmail = String(findKeyValue(row, [/lehrer.*email/i, /dozent.*email/i, /teacher.*email/i, /^email$/]) || "").trim().toLowerCase();
        const wochentagRaw = findKeyValue(row, [/^wochentag$/, /^tag$/, /^day/i]);
        const uhrzeitRaw = findKeyValue(row, [/^uhrzeit$/, /^zeit$/, /^time$/, /^start/i]);
        const dauerRaw = findKeyValue(row, [/^dauer$/, /^duration$/, /dauer.*std/i]);
        const raum = String(findKeyValue(row, [/^raum$/, /^zimmer$/, /^room$/]) || "").trim();

        if (kursname) {
          courses.push({
            courseName: kursname,
            teacherEmail: lehrerEmail || undefined,
            dayOfWeek: normalizeDayOfWeek(wochentagRaw),
            startTime: normalizeTimeString(uhrzeitRaw),
            duration: normalizeDuration(dauerRaw),
            roomName: raum || undefined,
          });
        }
      }
    }

    // 3. Parse Schueler sheet
    const students: StudentImportRow[] = [];
    const sSheetName = schuelerSheetName || (sheetNames.length > 2 ? sheetNames[2] : undefined);
    if (sSheetName && workbook.Sheets[sSheetName]) {
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sSheetName], { defval: "" });
      for (const row of rawRows) {
        const vorname = String(findKeyValue(row, [/^vorname$/, /first.*name/i]) || "").trim();
        const nachname = String(findKeyValue(row, [/^nachname$/, /last.*name/i, /familienname/i]) || "").trim();
        const elternname = String(findKeyValue(row, [/eltern.*name/i, /parent.*name/i, /mutter/i, /vater/i]) || "").trim();
        const elternTelefon = String(findKeyValue(row, [/eltern.*tel/i, /eltern.*phone/i, /parent.*phone/i, /^telefon$/, /^phone$/]) || "").trim();
        const kursname = String(findKeyValue(row, [/^kursname$/, /^kurs$/, /^course$/, /^fach$/]) || "").trim();
        const email = String(findKeyValue(row, [/^email$/, /^e-mail$/, /mail/i]) || "").trim().toLowerCase();

        if (vorname || nachname) {
          students.push({
            firstName: vorname || nachname,
            lastName: vorname ? nachname : "",
            email: email || undefined,
            parentName: elternname || undefined,
            parentPhone: elternTelefon || undefined,
            courseName: kursname || undefined,
          });
        }
      }
    }

    return {
      mode: "multi_sheet",
      fileName: file.name,
      teachers,
      courses,
      students,
      warnings,
    };
  }

  // Fallback: Single Sheet (CSV or simple 1-sheet file)
  const firstSheetName = sheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });

  const students: StudentImportRow[] = [];
  for (const row of rawRows) {
    const vorname = String(findKeyValue(row, [/^vorname$/, /first.*name/i]) || "").trim();
    const nachname = String(findKeyValue(row, [/^nachname$/, /last.*name/i, /familienname/i]) || "").trim();
    const email = String(findKeyValue(row, [/^email$/, /^e-mail$/, /mail/i]) || "").trim().toLowerCase();
    const phone = String(findKeyValue(row, [/^telefon$/, /^phone$/, /^tel$/, /^handy$/]) || "").trim();
    const elternname = String(findKeyValue(row, [/eltern.*name/i, /parent.*name/i]) || "").trim();
    const elternTelefon = String(findKeyValue(row, [/eltern.*telefon/i, /eltern.*phone/i, /parent.*phone/i]) || "").trim();
    const kursname = String(findKeyValue(row, [/^kurs$/, /^kursname$/, /^course$/, /^fach$/]) || "").trim();

    if (vorname || nachname) {
      students.push({
        firstName: vorname || nachname,
        lastName: vorname ? nachname : "",
        email: email || undefined,
        phone: phone || undefined,
        parentName: elternname || undefined,
        parentPhone: elternTelefon || phone || undefined,
        courseName: kursname || undefined,
      });
    }
  }

  return {
    mode: "single_csv",
    fileName: file.name,
    teachers: [],
    courses: [],
    students,
    warnings: ["Einzelne Tabelle (CSV) erkannt. Importiert Schüler und legt Kurse bei Bedarf an."],
  };
}

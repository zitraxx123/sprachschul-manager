"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  BookOpen, 
  Users, 
  Euro, 
  DoorOpen, 
  GraduationCap, 
  Sparkles,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FaqItem {
  id: string;
  category: "courses" | "students" | "attendance" | "finance" | "rooms" | "portal";
  categoryLabel: string;
  question: string;
  answer: React.ReactNode;
  keywords: string[];
}

const FAQ_DATA: FaqItem[] = [
  {
    id: "create-course",
    category: "courses",
    categoryLabel: "Kurse & Stundenplan",
    question: "Wie lege ich einen neuen Kurs an?",
    keywords: ["kurs", "neu", "anlegen", "erstellen", "stundenplan", "raum", "lehrer zuweisen"],
    answer: (
      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          Das Anlegen eines neuen Kurses erfolgt in wenigen einfachen Schritten über das Hauptmenü:
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Navigieren Sie in der linken Seitenleiste auf <strong className="text-slate-900 dark:text-slate-100">Kurse</strong> und klicken Sie auf den Button <strong className="text-blue-600 dark:text-blue-400">„Kurs anlegen”</strong>.
          </li>
          <li>
            Tragen Sie den <strong className="text-slate-800 dark:text-slate-200">Kursnamen</strong> (z. B. <em>Deutsch B2</em> oder <em>Englisch Konversation</em>) und optional das Fach / Niveau ein.
          </li>
          <li>
            Wählen Sie den <strong className="text-slate-800 dark:text-slate-200">Kurstyp</strong>:
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
              <li><strong>Gruppenkurs:</strong> Mehrere Teilnehmer mit gemeinsamer Anwesenheitsliste.</li>
              <li><strong>Einzelunterricht:</strong> Individuelle 1-zu-1-Betreuung (wird im Wochenplan farblich hervorgehoben).</li>
            </ul>
          </li>
          <li>
            Wählen Sie die zuständige <strong className="text-slate-800 dark:text-slate-200">Lehrkraft</strong> und bei Bedarf den passenden <strong className="text-slate-800 dark:text-slate-200">Raum</strong> (z. B. <em>Raum 1</em>, <em>Online Zoom</em>).
          </li>
          <li>
            Definieren Sie die regelmäßigen <strong className="text-slate-800 dark:text-slate-200">Unterrichtstage und -uhrzeiten</strong> (z. B. Montag und Mittwoch 18:00 – 19:30 Uhr).
          </li>
          <li>
            Weisen Sie im Feld <strong className="text-slate-800 dark:text-slate-200">„Schüler zuweisen”</strong> direkt Teilnehmer per schnellem Such-Combobox zu.
          </li>
        </ol>
        <div className="pt-2">
          <Link href="/courses">
            <Button size="sm" variant="outline" className="text-xs space-x-2">
              <span>Zu den Kursen</span>
              <ArrowRight strokeWidth={1.5} className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    ),
  },
  {
    id: "attendance-tracking",
    category: "attendance",
    categoryLabel: "Anwesenheit & Fehlzeiten",
    question: "Wie funktioniert die Anwesenheitsliste und Fehlzeiten-Erfassung?",
    keywords: ["anwesenheit", "journal", "abwesend", "entschuldigt", "fehlzeiten", "roter punkt", "verspätung"],
    answer: (
      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          Die Anwesenheit wird für jeden Unterrichtstermin präzise erfasst, um den Lernfortschritt zu sichern und Abwesenheiten sofort zu erkennen:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 my-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5">✓ Anwesend</span>
            Schüler hat regulär am Unterricht teilgenommen.
          </div>
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs">
            <span className="font-bold text-red-800 dark:text-red-300 block mb-0.5">✗ Abwesend</span>
            Unentschuldigtes Fehlen. Löst eine Warnung im Wochenplan aus.
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
            <span className="font-bold text-amber-800 dark:text-amber-300 block mb-0.5">⏳ Entschuldigt</span>
            Schüler hat sich krank- oder abgemeldet.
          </div>
        </div>
        <p>
          <strong className="text-slate-800 dark:text-slate-200">Intelligente Kennzeichnung im Wochenplan:</strong><br />
          Wenn ein Unterrichtstermin in der Vergangenheit liegt und mindestens ein Teilnehmer unentschuldigt gefehlt hat, erscheint auf der Kurskarte im Wochenplan ein <span className="inline-flex items-center text-red-600 dark:text-red-400 font-semibold">🔴 roter Punkt / Warnhinweis</span>. Beim Klick auf den Kurs sehen Sie sofort die Namen der abwesenden Schüler.
        </p>
        <div className="pt-2">
          <Link href="/absences">
            <Button size="sm" variant="outline" className="text-xs space-x-2">
              <span>Zur Fehlzeiten-Übersicht</span>
              <ArrowRight strokeWidth={1.5} className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    ),
  },
  {
    id: "import-students",
    category: "students",
    categoryLabel: "Schüler & Import",
    question: "Wie importiere ich Schüler per CSV / Excel?",
    keywords: ["import", "csv", "excel", "schüler", "massenimport", "datei", "tabelle", "vorlage"],
    answer: (
      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          Über die Import-Funktion können Sie hunderte Schüler in Sekundenschnelle aus Microsoft Excel, Apple Numbers oder Google Tabellen importieren:
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Öffnen Sie die Seite <strong className="text-slate-900 dark:text-slate-100">Schüler</strong>.
          </li>
          <li>
            Klicken Sie oben rechts auf den Button <strong className="text-blue-600 dark:text-blue-400">„Schüler importieren”</strong>.
          </li>
          <li>
            Klicken Sie im Dialog auf <strong className="text-slate-800 dark:text-slate-200">„Vorlage herunterladen”</strong>, um eine formatierte Muster-Datei mit den Spalten <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs">Vorname, Nachname, Email, Telefon, Kurs</code> zu erhalten.
          </li>
          <li>
            Fügen Sie Ihre Schülerdaten ein und ziehen Sie die CSV-Datei in das Upload-Feld.
          </li>
          <li>
            Prüfen Sie die interaktive <strong className="text-slate-800 dark:text-slate-200">Vorschau</strong> und bestätigen Sie mit <strong>„Jetzt importieren”</strong>.
          </li>
        </ol>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-300">
          <strong>Tipp:</strong> Wenn ein im CSV genannter Kurs noch nicht existiert, wird er vom System auf Wunsch automatisch für Ihre Sprachschule vorbereitet.
        </div>
        <div className="pt-2">
          <Link href="/students">
            <Button size="sm" variant="outline" className="text-xs space-x-2">
              <span>Zur Schülerverwaltung</span>
              <ArrowRight strokeWidth={1.5} className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    ),
  },
  {
    id: "monthly-fees",
    category: "finance",
    categoryLabel: "Finanzen & Zahlungen",
    question: "Wie berechnen und verwalten sich die Monatsbeiträge?",
    keywords: ["monatsbeitrag", "abo", "monatsabo", "zahlung", "bezahlt", "offen", "beiträge", "geld"],
    answer: (
      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          Für Sprachschulen nutzt das System ein modernes, transparentes <strong>Monatsabo-Modell</strong>:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Jeder Schüler hat einen festen monatlichen Schulbeitrag (z. B. 120,00 € / Monat).
          </li>
          <li>
            In der Schülerübersicht sehen Sie für den aktuellen Monat auf einen Blick den Status:
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 ml-1">Bezahlt</span> oder 
            <span className="font-semibold text-amber-600 dark:text-amber-400 ml-1">Offener Beitrag</span>.
          </li>
          <li>
            Sobald eine Zahlung per Überweisung, Dauerauftrag oder Barzahlung eingeht, klicken Sie bei der Zeile des Schülers auf <strong className="text-slate-800 dark:text-slate-200">„Zahlung verbuchen”</strong>.
          </li>
          <li>
            Der Betrag wird sofort als bezahlt markiert und fließt in die monatliche Umsatzstatistik auf dem Dashboard ein.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "teacher-payroll",
    category: "finance",
    categoryLabel: "Finanzen & Zahlungen",
    question: "Wie rechne ich Honorare für Lehrkräfte ab?",
    keywords: ["honorar", "lehrer", "stundensatz", "abrechnung", "gehalt", "stundenlohn", "lohn", "auszahlung"],
    answer: (
      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          Die Honorarabrechnung basiert auf den tatsächlich gehaltenen Unterrichtsstunden und dem hinterlegten Stundensatz der Lehrkraft:
        </p>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Berechnungsformel
          </p>
          <div className="font-mono text-sm bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400">
            Unterrichtsstunden (Std.) &times; Stundensatz (€ / Std.) = Fälliges Monatshonorar (€)
          </div>
        </div>
        <p>
          Unter <strong className="text-slate-800 dark:text-slate-200">Lehrkräfte</strong> können Sie die Akte jeder Lehrkraft aufrufen, die gehaltenen Stunden für jeden Monat einsehen und Abrechnungsberichte erstellen.
        </p>
        <div className="pt-2">
          <Link href="/teachers">
            <Button size="sm" variant="outline" className="text-xs space-x-2">
              <span>Zu den Lehrkräften</span>
              <ArrowRight strokeWidth={1.5} className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    ),
  },
  {
    id: "manage-rooms",
    category: "rooms",
    categoryLabel: "Räume & Infrastruktur",
    question: "Wie erstelle und verwalte ich Unterrichtsräume?",
    keywords: ["räume", "raum", "zimmer", "online", "zoom", "belegung", "ort"],
    answer: (
      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          Räume ermöglichen eine übersichtliche Zuweisung von Klassenräumen oder Online-Meetings:
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Klicken Sie im Menü auf <strong className="text-slate-900 dark:text-slate-100">Räume</strong>.
          </li>
          <li>
            Klicken Sie auf <strong className="text-blue-600 dark:text-blue-400">„Raum hinzufügen”</strong> und geben Sie den Namen ein (z. B. <em>Raum 101</em>, <em>Aula</em>, <em>Online Zoom Raum A</em>).
          </li>
          <li>
            Beim Bearbeiten eines Kurses können Sie den gewünschten Raum zuweisen.
          </li>
          <li>
            Der Raum wird automatisch auf jeder Kurskarte im <strong>Wochenplan</strong> angezeigt.
          </li>
        </ol>
        <div className="pt-2">
          <Link href="/rooms">
            <Button size="sm" variant="outline" className="text-xs space-x-2">
              <span>Zur Raumverwaltung</span>
              <ArrowRight strokeWidth={1.5} className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    ),
  },
  {
    id: "teacher-portal-guide",
    category: "portal",
    categoryLabel: "Lehrerportal",
    question: "Wie funktioniert das Portal für Lehrkräfte (Mein Portal)?",
    keywords: ["portal", "lehrerportal", "lehrkraft", "eigene kurse", "stunden eintragen", "anwesenheit führen"],
    answer: (
      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          Lehrkräfte erhalten einen eigenen, vereinfachten Zugang ohne Einblick in Schulfinanzen oder andere Lehrer:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Nach dem Login öffnet sich sofort <strong className="text-slate-900 dark:text-slate-100">Mein Portal</strong>.
          </li>
          <li>
            Die Lehrkraft sieht ihren persönlichen Wochenplan, die ihr zugewiesenen Kurse und Schülerlisten.
          </li>
          <li>
            Mit einem Klick auf <strong className="text-blue-600 dark:text-blue-400">„Stunde erfassen”</strong> trägt sie das behandelte Thema ein und markiert die Anwesenheit der Schüler.
          </li>
          <li>
            Ihr Honoraranspruch wird automatisch aktualisiert.
          </li>
        </ul>
      </div>
    ),
  },
];

const CATEGORIES = [
  { id: "all", labelKey: "allTopics", icon: Sparkles },
  { id: "courses", labelKey: "catCourses", icon: LayersIcon },
  { id: "students", labelKey: "catStudents", icon: Users },
  { id: "attendance", labelKey: "catAttendance", icon: BookOpen },
  { id: "finance", labelKey: "catFinance", icon: Euro },
  { id: "rooms", labelKey: "catRooms", icon: DoorOpen },
  { id: "portal", labelKey: "catPortal", icon: GraduationCap },
] as const;

function LayersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

export function HelpCenterView() {
  const tHelp = useTranslations("help");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openItemIds, setOpenItemIds] = useState<Set<string>>(
    new Set(["create-course", "attendance-tracking", "import-students"])
  );

  const categoryLabelMap: Record<string, string> = {
    courses: tHelp("catCourses"),
    students: tHelp("catStudents"),
    attendance: tHelp("catAttendance"),
    finance: tHelp("catFinance"),
    rooms: tHelp("catRooms"),
    portal: tHelp("catPortal"),
  };

  function toggleAccordion(id: string) {
    setOpenItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function expandAll() {
    setOpenItemIds(new Set(FAQ_DATA.map((item) => item.id)));
  }

  function collapseAll() {
    setOpenItemIds(new Set());
  }

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FAQ_DATA.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (!q) return true;
      const matchQuestion = item.question.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((k) => k.toLowerCase().includes(q));
      const matchCategory = item.categoryLabel.toLowerCase().includes(q);
      return matchQuestion || matchKeywords || matchCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-900 text-white p-6 sm:p-10 shadow-sm border border-blue-600/30">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-white/15 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-white/20">
            <HelpCircle strokeWidth={1.5} className="w-4 h-4" />
            <span>{tHelp("badge")}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {tHelp("heroTitle")}
          </h1>
          <p className="text-sm sm:text-base text-blue-100 mt-2 leading-relaxed">
            {tHelp("heroSubtitle")}
          </p>

          {/* Search Box */}
          <div className="mt-6 relative">
            <Search strokeWidth={1.5} className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tHelp("searchPlaceholder")}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-md border-0 focus:ring-4 focus:ring-blue-400/40 text-sm font-medium outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded-lg"
              >
                {tHelp("clearSearch")}
              </button>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-600/20"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tHelp(cat.labelKey)}</span>
            </button>
          );
        })}
      </div>

      {/* Accordion Controls Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          {tHelp("topicsCount", { count: filteredFaqs.length })}
          {searchQuery && tHelp("forQuery", { query: searchQuery })}
        </span>
        <div className="space-x-2">
          <button
            type="button"
            onClick={expandAll}
            className="hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer"
          >
            {tHelp("expandAll")}
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={collapseAll}
            className="hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer"
          >
            {tHelp("collapseAll")}
          </button>
        </div>
      </div>

      {/* FAQ Accordion List */}
      {filteredFaqs.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Search strokeWidth={1.5} className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {tHelp("noResults")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {tHelp("noResultsDesc")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="text-xs mt-2"
            >
              {tHelp("resetFilters")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((faq) => {
            const isOpen = openItemIds.has(faq.id);
            return (
              <div
                key={faq.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(faq.id)}
                  className="w-full p-4 sm:p-5 flex items-start justify-between text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="pr-4 space-y-1">
                    <Badge variant="secondary" className="text-[10px] font-medium mb-1">
                      {categoryLabelMap[faq.category] || faq.categoryLabel}
                    </Badge>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                      {faq.question}
                    </h3>
                  </div>
                  <div
                    className={`w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 transition-transform duration-200 shrink-0 mt-0.5 ${
                      isOpen ? "rotate-180 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400" : ""
                    }`}
                  >
                    <ChevronDown strokeWidth={1.5} className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-150">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Support Contact Box */}
      <Card className="border-blue-200 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/50 via-white to-blue-50/30 dark:from-blue-950/20 dark:via-slate-900 dark:to-blue-950/20">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {tHelp("needSupport")}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {tHelp("needSupportDesc")}
            </p>
          </div>
          <a
            href="mailto:support@sprachschule-app.de?subject=Hilfe-Anfrage%20Sprachschul-Manager"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 shadow-sm transition-colors"
          >
            <span>{tHelp("contactSupport")}</span>
            <ExternalLink strokeWidth={1.5} className="w-4 h-4" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
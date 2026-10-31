import Link from "next/link";
import { getCurrentUser, getCurrentTeacher, getCurrentMembership } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, 
  ArrowRight, 
  CheckCircle2, 
  Euro, 
  Smartphone, 
  ClipboardCheck, 
  ShieldCheck, 
  Check
} from "lucide-react";

export const metadata = {
  title: "Sprachschul-Manager • Die Verwaltungssoftware für Ihre Sprachschule",
  description:
    "Einfach. Digital. DSGVO-konform. Automatisieren Sie die Honorarabrechnung Ihrer Lehrkräfte und verwalten Sie Kurse sowie Anwesenheiten an einem Ort.",
};

export default async function HomePage() {
  const user = await getCurrentUser();
  const teacher = user ? await getCurrentTeacher() : null;
  const membership = user ? await getCurrentMembership() : null;
  const isTeacher = !!(teacher && membership?.role === "teacher");

  const portalHref = isTeacher ? "/my-portal" : "/dashboard";

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-600 selection:text-white flex flex-col font-sans">
      {/* 1. Header / Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-slate-900 text-lg tracking-tight block">
                Sprachschul-Manager
              </span>
              <span className="text-[11px] font-medium text-slate-400 block">
                B2B-Schulverwaltung
              </span>
            </div>
          </Link>

          {/* Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <a href="#vorteile" className="hover:text-blue-600 transition-colors">Vorteile</a>
            <a href="#ablauf" className="hover:text-blue-600 transition-colors">Ablauf</a>
            <a href="#funktionen" className="hover:text-blue-600 transition-colors">Funktionen</a>
            <a href="#sicherheit" className="hover:text-blue-600 transition-colors">Sicherheit</a>
          </nav>

          {/* Auth Action */}
          <div className="flex items-center space-x-3">
            {user ? (
              <Link href={portalHref}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 h-10 shadow-sm space-x-1.5">
                  <span>Zum Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-slate-700 hover:text-slate-900 font-medium text-sm">
                    Anmelden
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 h-10 shadow-sm space-x-1.5">
                    <span>Jetzt starten</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="pt-20 pb-16 md:pt-28 md:pb-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Trust Pill */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-blue-200 bg-blue-50/70 text-xs font-semibold text-blue-800 mb-6">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Für Sprachschulen &amp; Bildungsinstitute in Deutschland</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.15]">
          Die Verwaltungssoftware für Ihre Sprachschule.{" "}
          <span className="text-blue-600">Einfach. Digital. DSGVO-konform.</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
          Sparen Sie Stunden an Verwaltungsarbeit. Automatisieren Sie die Gehaltsabrechnung Ihrer 
          Lehrkräfte und verwalten Sie Kurse sowie Anwesenheiten an einem Ort.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-sm space-x-2">
              <span>Jetzt kostenlos testen</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <a href="#vorteile" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-7 border-slate-300 text-slate-700 hover:bg-slate-50 text-base">
              Vorteile entdecken
            </Button>
          </a>
        </div>

        {/* Trust Badges Bar */}
        <div className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs font-medium text-slate-500">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>100% DSGVO-konform (Server in Frankfurt)</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>GoBD-konforme Honorarabrechnung</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>Keine Kreditkarte erforderlich</span>
          </div>
        </div>

        {/* 3. Clean Product Preview Mockup (B2B UI) */}
        <div className="mt-14 max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden text-left">
          {/* Browser Chrome Header */}
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-slate-300" />
              <div className="w-3 h-3 rounded-full bg-slate-300" />
              <div className="w-3 h-3 rounded-full bg-slate-300" />
            </div>
            <div className="px-3 py-1 bg-white border border-slate-200 rounded text-[11px] font-mono text-slate-500 flex items-center space-x-1">
              <span>app.sprachschul-manager.de/my-portal</span>
            </div>
            <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              Klassenbuch Live
            </span>
          </div>

          {/* Inner Clean Mockup Content */}
          <div className="p-6 bg-slate-50/50 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Dozenten-Monatsgehalt</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">1.487,50 €</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">42.5 Std. × 35,00 €/Std.</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Unterrichtete Stunden</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">42.5 Std.</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Oktober 2026 (GoBD-konform)</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Anwesenheitsquote</span>
                <span className="text-2xl font-bold text-blue-600 mt-1 block">96,8 %</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Lückenlos protokolliert</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-900">Kurs: Deutsch B2 Beruf (18:00 – 19:30 Uhr)</span>
                </div>
                <span className="text-xs text-slate-500">12 Schüler zugewiesen</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-medium">
                  ✓ 11 Schüler anwesend
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded bg-rose-50 text-rose-700 font-medium">
                  ✕ 1 Schüler abwesend
                </span>
                <span className="text-slate-400 ml-auto hidden sm:inline">
                  Dozent: Dr. M. Weber • Automatisch verbucht
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section: Warum wir? (Schluss mit Excel und Zettelwirtschaft) */}
      <section id="vorteile" className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              WARUM WIR?
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-2 tracking-tight">
              Schluss mit Excel und Zettelwirtschaft.
            </h2>
            <p className="text-slate-600 mt-3 text-sm sm:text-base">
              Veraltete Tabellen kosten Zeit, führen zu Abrechnungsfehlern und erzeugen unnötigen Streit. 
              Wir digitalisieren Ihre Kernprozesse mit deutscher Gründlichkeit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Column 1: Fehlerfreie Honorarabrechnung */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-6">
                  <Euro className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Fehlerfreie Honorarabrechnung
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Mehr als die Hälfte der Abrechnungszeit entfällt auf das Zählen von Stunden. 
                  Unser System multipliziert geleistete Einheiten exakt mit dem Stundensatz der Lehrkraft. 
                  Keine Excel-Fehler, keine Diskussionen am Monatsende.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center space-x-1">
                <span>GoBD-konformer PDF-Export</span>
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Column 2: Lehrer-Portal für das Smartphone */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-6">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Lehrer-Portal für das Smartphone
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Lehrkräfte haken die Anwesenheit direkt im Unterricht auf ihrem Smartphone ab. 
                  Sie sehen nur ihre eigenen Kurse und haben ihren aktuellen Verdienst 
                  in Echtzeit im Blick – ohne Einblick in fremde Schuldaten.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center space-x-1">
                <span>Optimiert für iOS &amp; Android</span>
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Column 3: Lückenlose Dokumentation */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-6">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Lückenlose Dokumentation
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Behalten Sie unentschuldigte Fehlzeiten für BAMF, Arbeitsagenturen oder Firmenkunden im Griff. 
                  Der integrierte Abwesenheitsbericht filtert nach Tag, Woche oder Monat mit Kontaktdaten 
                  auf Knopfdruck.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center space-x-1">
                <span>Prüfungssicher &amp; DSGVO-konform</span>
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section: Wie es funktioniert (In 3 Schritten) */}
      <section id="ablauf" className="py-20 md:py-28 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            EINFACHER ABLAUF
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-2 tracking-tight">
            In 3 Schritten startklar
          </h2>
          <p className="text-slate-600 mt-3 text-sm sm:text-base">
            Keine komplizierte Installation. Keine langwierige Schulung.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="relative bg-white p-8 rounded-2xl border border-slate-200">
            <span className="text-3xl font-black text-blue-600 block mb-4">
              01
            </span>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Kurse &amp; Schüler anlegen
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Erfassen Sie Ihre Sprachkurse mit Wochentagen, Dozenten und Zeiten. 
              Weisen Sie Schüler flexibel einzelnen oder mehreren Gruppen zu.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative bg-white p-8 rounded-2xl border border-slate-200">
            <span className="text-3xl font-black text-blue-600 block mb-4">
              02
            </span>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Lehrer unterrichten
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Die Lehrkraft öffnet ihren Wochenplan im Dozenten-Portal, hält die Stunde ab 
              und markiert die Anwesenheiten mit einem Fingertipp.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative bg-white p-8 rounded-2xl border border-slate-200">
            <span className="text-3xl font-black text-blue-600 block mb-4">
              03
            </span>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Gehälter automatisch berechnen
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Das System berechnet das Honorar automatisch. Am Monatsende exportieren Sie 
              den fertigen Tätigkeitsnachweis als druckfertiges PDF.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Section: Sicherheit & Mandantentrennung */}
      <section id="sicherheit" className="py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            Höchste Datensicherheit nach deutschem Standard
          </h3>
          <p className="text-slate-600 text-sm mt-3 leading-relaxed max-w-2xl mx-auto">
            Ihre Schüler- und Dozentendaten werden in ISO 27001-zertifizierten Rechenzentren 
            in Frankfurt am Main gespeichert. Durch strikte Mandantentrennung (Row Level Security) 
            hat keine andere Organisation Zugriff auf Ihre Daten.
          </p>
        </div>
      </section>

      {/* 7. Bottom CTA Banner (Clean Deep Blue) */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-14 text-center shadow-lg">
          <h2 className="text-3xl sm:text-4xl font-bold max-w-xl mx-auto leading-tight">
            Bereit für eine moderne Sprachschulverwaltung?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-4 max-w-lg mx-auto">
            Starten Sie jetzt unverbindlich und erleben Sie, wie einfach Honorarabrechnung und Klassenbuch sein können.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-sm space-x-2">
                <span>Jetzt kostenlos testen</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Footer (Rechtliches & Impressum) */}
      <footer className="border-t border-slate-200 bg-white py-12 text-xs text-slate-500 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-100">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 text-base">
                Sprachschul-Manager
              </span>
            </div>

            {/* Rechtliche Pflichtlinks nach TMG & DSGVO */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-slate-600 font-medium">
              <Link href="/impressum" className="hover:text-blue-600 transition-colors">
                Impressum
              </Link>
              <Link href="/datenschutz" className="hover:text-blue-600 transition-colors">
                Datenschutzerklärung
              </Link>
              <Link href="/login" className="hover:text-blue-600 transition-colors">
                Schul-Login
              </Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400">
            <p>© 2026 Sprachschul-Manager. Alle Rechte vorbehalten.</p>
            <p className="flex items-center space-x-1.5">
              <span>Entwickelt &amp; gehostet in Deutschland</span>
              <span>🇩🇪</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

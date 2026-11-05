import Link from "next/link";
import { GraduationCap, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Datenschutzerklärung • Klasswerk",
  description: "Datenschutzerklärung gemäß Datenschutz-Grundverordnung (DSGVO).",
};

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800 selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <GraduationCap strokeWidth={1.5} className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-base">Klasswerk</span>
          </Link>

          <Link href="/">
            <Button variant="ghost" size="sm" className="space-x-2 text-xs text-slate-600">
              <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />
              <span>Zurück zur Startseite</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-3">
            <ShieldCheck strokeWidth={1.5} className="w-4 h-4" />
            <span>100% DSGVO-konform • Serverstandort Deutschland</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Datenschutzerklärung</h1>
          <p className="text-sm text-slate-500 mt-1">Stand: Oktober 2026</p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed text-slate-700">
          <h2 className="text-base font-bold text-slate-900">1. Datenschutz auf einen Blick</h2>
          <p>
            Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre 
            personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften (DSGVO, BDSG) sowie dieser Datenschutzerklärung.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-slate-700">
          <h2 className="text-base font-bold text-slate-900">2. Verantwortliche Stelle</h2>
          <p>
            Verantwortlich für die Datenverarbeitung auf dieser Website ist:<br /><br />
            <strong>Klasswerk SaaS</strong><br />
            Musterstraße 42<br />
            10115 Berlin, Deutschland<br />
            E-Mail: studiowebnord@gmail.com
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-slate-700">
          <h2 className="text-base font-bold text-slate-900">3. Datenerfassung und Mandantentrennung (Multi-Tenant)</h2>
          <p>
            Unsere Software arbeitet mit einer strikten Mandantentrennung (Row Level Security). Daten von Schülern, Dozenten, 
            Kursen und Abrechnungen sind streng isoliert und ausschließlich den autorisierten Mitgliedern der jeweiligen Sprachschule zugänglich.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-slate-700">
          <h2 className="text-base font-bold text-slate-900">4. Hosting und Auftragsverarbeitung</h2>
          <p>
            Diese Anwendung und die zugehörigen Datenbanken werden in zertifizierten Rechenzentren innerhalb der Europäischen Union 
            (Frankfurt am Main, Deutschland) gehostet. Ein Vertrag zur Auftragsverarbeitung (AVV) gemäß Art. 28 DSGVO wird für Bildungsträger bereitgestellt.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-slate-700">
          <h2 className="text-base font-bold text-slate-900">5. Ihre Rechte</h2>
          <p className="text-xs text-slate-600">
            Sie haben jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger 
            und den Zweck der Datenverarbeitung sowie ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten (Art. 15–20 DSGVO).
          </p>
        </section>
      </main>
    </div>
  );
}

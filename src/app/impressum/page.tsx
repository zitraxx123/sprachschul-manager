import Link from "next/link";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Impressum • Klasswerk",
  description: "Impressum und rechtliche Angaben gemäß § 5 TMG.",
};

export default function ImpressumPage() {
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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Impressum</h1>
          <p className="text-sm text-slate-500 mt-1">Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG) / § 5 TMG</p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed text-slate-700">
          <h2 className="text-base font-bold text-slate-900">Diensteanbieter &amp; Betreiber</h2>
          <p>
            <strong>Klasswerk SaaS</strong><br />
            Musterstraße 42<br />
            10115 Berlin<br />
            Deutschland
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-slate-700">
          <h2 className="text-base font-bold text-slate-900">Kontakt</h2>
          <p>
            Telefon: +49 (0) 30 12345678<br />
            E-Mail: studiowebnord@gmail.com
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-slate-700">
          <h2 className="text-base font-bold text-slate-900">Umsatzsteuer-Identifikationsnummer</h2>
          <p>
            Gemäß § 27 a Umsatzsteuergesetz:<br />
            DE 123 456 789
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-slate-700">
          <h2 className="text-base font-bold text-slate-900">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p>
            Max Mustermann<br />
            Musterstraße 42<br />
            10115 Berlin
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-slate-700">
          <h2 className="text-base font-bold text-slate-900">Haftung für Inhalte und Links</h2>
          <p className="text-xs text-slate-500 leading-normal">
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. 
            Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen 
            oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen 
            nach den allgemeinen Gesetzen bleiben hiervon unberührt.
          </p>
        </section>
      </main>
    </div>
  );
}

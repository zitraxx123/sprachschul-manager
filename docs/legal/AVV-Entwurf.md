# Vertrag zur Auftragsverarbeitung (AVV) nach Art. 28 DSGVO

> **ENTWURF, keine Rechtsberatung.** Muss vor der Verwendung von einer Rechtsanwältin / einem Rechtsanwalt mit Datenschutzerfahrung geprüft und angepasst werden. Platzhalter in `[eckigen Klammern]` ausfüllen.

zwischen

**[Name der Schule / Einrichtung], [Anschrift]** (nachfolgend „Verantwortlicher“)

und

**[Name des Anbieters], [Anschrift]** (nachfolgend „Auftragsverarbeiter“)

## 1. Gegenstand und Dauer

1.1 Der Auftragsverarbeiter stellt dem Verantwortlichen die Software „Sprachschul-Manager“ als Online-Dienst (SaaS) zur Verwaltung von Schülern, Kursen, Lehrkräften, Stundenplänen, Rechnungen und Honorarabrechnungen bereit (Hauptvertrag / Nutzungsbedingungen).

1.2 Dabei verarbeitet der Auftragsverarbeiter personenbezogene Daten im Auftrag und nach Weisung des Verantwortlichen.

1.3 Die Dauer dieses Vertrags richtet sich nach der Laufzeit des Hauptvertrags.

## 2. Art, Zweck, Daten und Betroffene

| | |
|---|---|
| **Art der Verarbeitung** | Speicherung, Abruf, Anzeige, Verknüpfung, Export, Löschung / Anonymisierung |
| **Zweck** | Bereitstellung der Schulverwaltungssoftware (Schüler-, Kurs-, Lehrer-, Rechnungs- und Abrechnungsverwaltung) |
| **Datenarten** | Stammdaten (Name, E-Mail, Telefon, Geburtstag), Vertrags- und Kursdaten, Anwesenheit, Rechnungs- und Zahlungsdaten, Bankdaten (IBAN, SEPA-Mandate), Steuer-ID und Beschäftigungsart von Lehrkräften, Nutzungs- und Anmeldedaten |
| **Betroffene** | Schüler und Kursteilnehmer, deren Eltern / Erziehungsberechtigte, Lehrkräfte, Mitarbeitende des Verantwortlichen |

Besondere Kategorien personenbezogener Daten (Art. 9 DSGVO) sollen nicht gespeichert werden. [Vom Verantwortlichen zu bestätigen.]

## 3. Weisungen

3.1 Der Auftragsverarbeiter verarbeitet die Daten nur auf dokumentierte Weisung des Verantwortlichen. Die Nutzung der Software durch den Verantwortlichen gilt als Weisung.

3.2 Hält der Auftragsverarbeiter eine Weisung für rechtswidrig, informiert er den Verantwortlichen unverzüglich.

## 4. Pflichten des Auftragsverarbeiters

4.1 Vertraulichkeit: Alle zur Verarbeitung befugten Personen sind zur Vertraulichkeit verpflichtet.

4.2 Technische und organisatorische Maßnahmen (Art. 32 DSGVO) gemäß **Anlage 1**.

4.3 Unterstützung des Verantwortlichen bei Betroffenenrechten (Auskunft, Berichtigung, Löschung, Übertragbarkeit). Die Software bietet hierfür einen Export (JSON) und eine Anonymisierung je Schüler.

4.4 Unterstützung bei Sicherheitsvorfällen: Der Auftragsverarbeiter meldet Verletzungen des Schutzes personenbezogener Daten unverzüglich, spätestens innerhalb von [48] Stunden nach Bekanntwerden.

4.5 Unterstützung bei Datenschutz-Folgenabschätzungen und Konsultationen der Aufsichtsbehörde, soweit erforderlich.

4.6 Der Auftragsverarbeiter führt ein Verzeichnis der Verarbeitungstätigkeiten (Art. 30 Abs. 2 DSGVO).

## 5. Unterauftragsverarbeiter

5.1 Der Verantwortliche stimmt dem Einsatz der in **Anlage 2** genannten Unterauftragsverarbeiter zu.

5.2 Änderungen werden dem Verantwortlichen mindestens [30] Tage vorher mitgeteilt. Der Verantwortliche kann aus wichtigem Grund widersprechen.

5.3 Der Auftragsverarbeiter verpflichtet Unterauftragsverarbeiter vertraglich auf dasselbe Datenschutzniveau.

## 6. Drittlandübermittlung

Daten werden grundsätzlich in der EU / im EWR verarbeitet. Eine Übermittlung in Drittländer erfolgt nur bei Vorliegen der Voraussetzungen der Art. 44 ff. DSGVO (z. B. EU-US Data Privacy Framework oder Standardvertragsklauseln). [Konkrete Hosting-Regionen eintragen.]

## 7. Kontrollrechte

Der Verantwortliche darf die Einhaltung dieses Vertrags prüfen. Der Auftragsverarbeiter stellt dafür die erforderlichen Informationen bereit (z. B. Dokumentation der Maßnahmen, Zertifikate von Unterauftragsverarbeitern). Vor-Ort-Kontrollen nach Terminabsprache.

## 8. Rückgabe und Löschung

Nach Vertragsende gibt der Auftragsverarbeiter die Daten auf Wunsch heraus (Export) und löscht sie spätestens [30] Tage danach, soweit keine gesetzliche Aufbewahrungspflicht besteht. Backups werden im regulären Zyklus überschrieben.

## 9. Haftung, Schlussbestimmungen

9.1 Es gelten die Haftungsregeln des Art. 82 DSGVO sowie des Hauptvertrags. [Rechtlich prüfen.]

9.2 Änderungen bedürfen der Textform. Es gilt deutsches Recht. Gerichtsstand: [Ort].

Ort, Datum: ______________________

Verantwortlicher: ______________________    Auftragsverarbeiter: ______________________

---

## Anlage 1: Technische und organisatorische Maßnahmen (Entwurf, an Realität anpassen)

| Bereich | Maßnahme |
|---|---|
| Zutrittskontrolle | Kein eigener Serverraum; Rechenzentren der Unterauftragsverarbeiter mit deren Zertifizierungen |
| Zugangskontrolle | Anmeldung mit E-Mail und Passwort über Supabase Auth; Passwort-Zurücksetzen per einmaligem Link; verschlüsselte Übertragung (TLS) |
| Zugriffskontrolle | Rollen (Inhaber / Admin / Lehrkraft); Mandantentrennung per Row Level Security in der Datenbank; Lehrkräfte sehen nur eigene Kurse und Schüler; Bankdaten nur für Admins |
| Weitergabekontrolle | TLS für alle Verbindungen; Exporte nur für angemeldete Admins |
| Eingabekontrolle | [Änderungsprotokoll, sobald umgesetzt (Roadmap Punkt 7)]; Rechnungen werden nicht gelöscht, sondern storniert |
| Verfügbarkeit | Automatische Backups des Datenbankanbieters [Umfang prüfen: Tarif]; Hosting auf Vercel |
| Trennungskontrolle | Alle Daten tragen eine Mandanten-ID; Zugriff nur über RLS-Regeln |
| Datenminimierung | Anonymisierung / Löschung je Schüler; Fehlerüberwachung ohne Tracing und Session-Replay [falls Sentry aktiv] |
| Organisation | Zugriff auf Produktivdaten nur durch befugte Personen des Auftragsverarbeiters; Schlüssel (Service Role) nur in der Hosting-Umgebung, nicht im Quellcode |

## Anlage 2: Unterauftragsverarbeiter (Stand: [Datum], prüfen)

| Unternehmen | Leistung | Ort / Region | Garantien |
|---|---|---|---|
| Supabase, Inc. | Datenbank, Authentifizierung | [Region des Projekts eintragen, z. B. Frankfurt] | [AVV / DPA des Anbieters, SCC] |
| Vercel Inc. | Hosting der Anwendung | [Region eintragen] | [DPA des Anbieters, DPF / SCC] |
| Functional Software, Inc. (Sentry) | Fehlerüberwachung (nur falls aktiviert) | [EU / US] | [DPA, SCC] |
| Stripe Payments Europe Ltd. | Zahlungsabwicklung für Abonnements (nur falls aktiviert) | EU | [DPA des Anbieters] |

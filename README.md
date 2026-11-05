# 🇩🇪 Klasswerk — Multi-Tenant SaaS Boilerplate

Moderne, erweiterbare SaaS-Vorlage für das Management von Sprachschulen (*Sprachschulen*) und Nachhilfeinstituten in Deutschland. 

Entwickelt auf Basis von **Next.js 15 (App Router)**, **React 19**, **Supabase (PostgreSQL + RLS)**, **TypeScript** und **Tailwind CSS**.

---

## 🎯 Funktionsumfang (MVP)

1. **Authentifizierung & Multi-Tenancy:**
   - Registrierung & Login über Supabase Auth.
   - Jeder registrierte Nutzer legt automatisch seinen eigenen Mandanten (*Organisation / Sprachschule*) an.
   - **Strikte Datenisolation:** Alle Daten (`teachers`, `lessons`, `organizations`) sind über PostgreSQL **Row Level Security (RLS)** auf Datenbankebene isoliert.

2. **Dashboard (`/dashboard`):**
   - KPI-Karten für aktive Lehrkräfte, gehaltene Unterrichtsstunden im laufenden Monat und fällige Honorare.
   - Schnellübersicht aller Dozenten inklusive Monatslohn-Vorschau.
   - Liste der zuletzt erfassten Unterrichtseinheiten.

3. **Dozentenverwaltung (`/teachers`):**
   - CRUD für Lehrkräfte (Name, E-Mail, vertraglicher Stundensatz in EUR).
   - Übersicht über geleistete Einheiten und Monatsgehalt.

4. **Klassenbuch / Unterrichtsstunden (`/lessons`):**
   - Dokumentation von Unterrichtseinheiten (Dozent, Datum, Dauer in Stunden, Schüler/Kurs, Notizen).
   - Automatische Multiplikation von Dauer × Stundensatz.

5. **Honorarabrechnung & Dozentenprofil (`/teachers/[id]`):**
   - Monatsbasierter Honorarrechner: `(Geleistete Stunden im Monat) × (Stundensatz) = Auszahlungsbetrag`.
   - Detaillierter Unterrichtsnachweis für den Steuerberater oder den Dozenten.

---

## 🏗️ Architektur & Tech-Stack

```
├── src/
│   ├── actions/                  # Server Actions (Auth, Teachers, Lessons)
│   │   ├── auth.ts               # signIn, signUp, signOut
│   │   ├── teachers.ts           # createTeacher, deleteTeacher
│   │   └── lessons.ts            # createLesson, deleteLesson
│   ├── app/                      # Next.js 15 App Router
│   │   ├── (app)/                # Geschützte Mandanten-Routen
│   │   │   ├── layout.tsx        # App-Shell (Sidebar, Header, Auth-Guard)
│   │   │   ├── dashboard/        # Dashboard mit KPIs & Schnellaktionen
│   │   │   ├── teachers/         # Dozentenliste & Modal
│   │   │   │   └── [id]/         # Dozentenprofil & Monatsabrechnung
│   │   │   └── lessons/          # Unterrichtsstunden / Klassenbuch
│   │   ├── login/                # Login & Registrierung (Mandantenanlage)
│   │   ├── globals.css           # Tailwind + Design Tokens
│   │   ├── layout.tsx            # Root-Layout
│   │   └── page.tsx              # Root-Redirect (/ -> /dashboard oder /login)
│   ├── components/               # Wiederverwendbare UI-Komponenten
│   │   ├── auth/                 # AuthForm
│   │   ├── layout/               # Sidebar, Header
│   │   ├── teachers/             # AddTeacherDialog
│   │   ├── lessons/              # AddLessonDialog, DeleteLessonButton
│   │   └── ui/                   # shadcn-inspirierte Primitiven (Button, Card, Input, Table, Badge)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser Client (createBrowserClient)
│   │   │   ├── server.ts         # Server Client (createServerClient via cookies())
│   │   │   └── middleware.ts     # Session Refresh & Route Protection
│   │   └── utils.ts              # cn(), formatCurrency (EUR), formatDate (de-DE)
│   ├── types/
│   │   └── database.ts           # Vollständig typisierte PostgreSQL-Schemas
│   └── middleware.ts             # Globaler Next.js Session & Auth Router
└── supabase/
    └── migrations/
        └── 20261031000000_init_schema.sql  # SQL-Schema, Trigger & RLS-Policies
```

---

## 🗄️ Datenbankschema & Multi-Tenancy (RLS)

Die Migration liegt unter `supabase/migrations/20261031000000_init_schema.sql`.

### Tabellen-Übersicht:
1. **`organizations`**: Mandant / Schule (`id`, `name`, `created_at`, `updated_at`).
2. **`organization_members`**: Verknüpfung zwischen `auth.users` und `organizations` mit Rolle (`owner`, `admin`, `teacher`).
3. **`teachers`**: Dozenten der Schule (`id`, `organization_id`, `name`, `email`, `hourly_rate`).
4. **`lessons`**: Unterrichtsstunden (`id`, `organization_id`, `teacher_id`, `student_name`, `lesson_date`, `duration_hours`, `notes`).

### RLS-Sicherheitskonzept:
Jede Tabelle besitzt aktivierte Row Level Security. Über die Security-Definer-Funktion `public.get_user_org_ids()` wird sichergestellt, dass ein Benutzer **ausschließlich** Datensätze einsehen, erstellen oder bearbeiten kann, die zu seiner Schule gehören:

```sql
create policy "Users can view teachers in their organization"
    on public.teachers
    for select
    using (organization_id in (select public.get_user_org_ids()));
```

---

## 🚀 Lokale Installation & Schnellstart

### 1. Repository vorbereiten & Abhängigkeiten installieren
```bash
git clone <dein-repo-url>
cd WRK
npm install
```

### 2. Supabase-Projekt anlegen
1. Erstelle ein kostenloses Projekt auf [supabase.com](https://supabase.com).
2. Öffne den **SQL Editor** im Supabase-Dashboard.
3. Kopiere den Inhalt der Datei `supabase/migrations/20261031000000_init_schema.sql` in den SQL Editor und führe ihn aus (*Run*).
   > *Hinweis:* Dies erstellt alle Tabellen, Indizes, den Registrierungs-Trigger und die RLS-Policies.

### 3. Umgebungsvariablen einrichten
Kopiere `.env.example` nach `.env.local`:
```bash
cp .env.example .env.local
```

Füge deine Supabase-Keys ein (zu finden im Supabase Dashboard unter **Project Settings -> API**):
```env
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-public-key
```

### 4. Entwicklungsserver starten
```bash
npm run dev
```
Öffne [http://localhost:3000](http://localhost:3000) im Browser.

---

## 🚢 Deployment auf Vercel

1. **Repository zu GitHub pushen:**
   ```bash
   git init
   git add .
   git commit -m "feat: initial sprachschule saas boilerplate"
   git remote add origin <dein-github-repo>
   git push -u origin main
   ```

2. **Projekt in Vercel importieren:**
   - Gehe auf [vercel.com](https://vercel.com) -> *Add New Project*.
   - Wähle dein GitHub-Repository aus.
   - Hinterlege unter **Environment Variables**:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Klicke auf **Deploy**.

3. **Supabase Redirect-URLs anpassen:**
   - Gehe im Supabase Dashboard zu **Authentication -> URL Configuration**.
   - Trage unter *Site URL* deine Vercel-Domain ein (z. B. `https://meine-sprachschule.vercel.app`).
   - Füge `https://meine-sprachschule.vercel.app/**` zu den *Redirect URLs* hinzu.

---

## 🔮 Erweiterungsmöglichkeiten (Roadmap)

Die Architektur wurde bewusst modular und erweiterbar gehalten:

1. **Dozenten-Portal (Eigenes Login für Lehrer):**
   - In `organization_members` die Rolle `'teacher'` vergeben.
   - Lehrkräfte sehen nur ihr eigenes Profil (`teacher_id = auth.uid()`), ihren Stundenplan und ihre Honorarübersicht.
2. **Stundenpakete (Guthabenkonten für Schüler):**
   - Tabelle `students` und `student_packages` (`total_hours`, `used_hours`) anlegen.
   - Beim Erfassen einer Lesson in Server Action automatisch Stunden vom Paket abziehen.
3. **DATEV-Export & SEPA-Sammelüberweisung:**
   - Export der Monatsabrechnung als CSV im DATEV-Standardformat für deutsche Steuerberater.
   - Generierung von XML-Dateien nach dem SEPA-Standard (`pain.001`) zur Sammelauszahlung der Honorare bei deutschen Banken.
4. **Stripe Billing für Schulen:**
   - Integration von Stripe Checkout / Customer Portal für die monatliche SaaS-Abonnementgebühr der Schule.

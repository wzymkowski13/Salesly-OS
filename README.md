# Salesly OS v0.2

Prywatne centrum operacyjne dla dwóch użytkowników: zadania, kalendarz, CRM ubezpieczeniowy, historia klienta, odnowienia, rocznice i powiadomienia.

## v0.2 — UI/UX refresh

Ta wersja nie zmienia schematu bazy. To pełny lifting frontendu i codziennego flow:

- branding Salesly i logo w panelu,
- wyraźny, ciemny sidebar + jasna przestrzeń robocza,
- aktywna pozycja nawigacji,
- nazwa „Zadania” zamiast „Taski”,
- nowy dashboard z dzisiejszymi spotkaniami z klientami,
- kompaktowe przyciski szybkiego dodawania zamiast pełnych pasków formularzy,
- przebudowany kalendarz z lekkimi kolorami i czytelnym aktywnym widokiem,
- tabelowy, szybszy CRM,
- odświeżona karta klienta, powiadomienia, odnowienia i login,
- usunięte komentarze i teksty pomocnicze o „AI-owym” charakterze.

Jeżeli aktualizujesz działające v0.1, nie uruchamiasz żadnych nowych migracji Supabase. Zachowaj własny `.env.local`, skopiuj pliki v0.2 nad projekt, a następnie commit + push do GitHub. Vercel zrobi redeploy automatycznie.

## Co jest w tej wersji

- logowanie Google przez Supabase Auth,
- whitelist użytkowników przez `ALLOWED_EMAILS`,
- dashboard operacyjny,
- task manager z ownerem, terminem, godziną, priorytetem i przypomnieniem,
- kalendarz: dzień / tydzień / miesiąc,
- taski z godziną widoczne w kalendarzu,
- CRM dla firm i osób,
- typy produktów: grupowe, indywidualne życie, majątek, grupa otwarta, inne,
- osoby kontaktowe,
- historia aktywności klienta,
- follow-upy powiązane z klientem,
- odnowienia,
- automatyczne rocznice polis,
- in-app notifications generowane przez Supabase Cron (`pg_cron`),
- soft archive klienta,
- audit log zmian,
- responsywny web UI,
- struktura gotowa pod Google Calendar.

## Stack

- Next.js 16.3.3
- React 19.2
- TypeScript
- Tailwind CSS
- Supabase: Auth + PostgreSQL + RLS
- Vercel

## 1. Supabase

1. Utwórz nowy projekt Supabase.
2. Otwórz **SQL Editor**.
3. Uruchom kolejno:
   - `supabase/migrations/001_initial.sql`
   - `supabase/migrations/002_audit.sql`
   - `supabase/migrations/003_notifications.sql`
4. W projekcie Supabase otwórz Authentication -> Providers -> Google i włącz provider.

### Google OAuth

W Google Cloud utwórz OAuth Client typu Web Application.

Jako callback Google do Supabase dodaj URL wskazany w panelu Supabase dla providera Google, zwykle w formie:

`https://<PROJECT_REF>.supabase.co/auth/v1/callback`

W Supabase Authentication -> URL Configuration ustaw:

- Site URL lokalnie: `http://localhost:3000`
- Redirect URL lokalnie: `http://localhost:3000/auth/callback`
- po deployu dodaj też: `https://twoja-domena.pl/auth/callback`

## 2. Zmienne środowiskowe

Skopiuj:

```bash
cp .env.example .env.local
```

Uzupełnij:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
ALLOWED_EMAILS=mail1@gmail.com,mail2@gmail.com
```

`SUPABASE_SECRET_KEY` nigdy nie może mieć prefiksu `NEXT_PUBLIC_`.

## 3. Instalacja i start

```bash
npm install
npm run dev
```

Otwórz:

`http://localhost:3000`

Pierwsze poprawne logowanie whitelisted konta tworzy wpis w `profiles`.

## 4. Supabase Cron — przypomnienia

1. W Supabase wejdź w **Integrations -> Cron** i włącz `pg_cron`.
2. Uruchom raz plik `supabase/schedule_notifications.sql`.
3. Job `salesly-os-reminders` będzie uruchamiał generator co 15 minut.

Generator tworzy powiadomienia dla:

- tasków z ustawionym przypomnieniem,
- tasków przypadających danego dnia,
- odnowień: 60 / 30 / 14 / 7 / 1 / 0 dni,
- rocznic: 30 / 14 / 7 / 1 / 0 dni.

## 5. Vercel

1. Wrzuć repo na GitHub.
2. Importuj repo do Vercel.
3. Dodaj wszystkie zmienne środowiskowe z `.env.local`.
4. Zmień `NEXT_PUBLIC_APP_URL` na publiczny adres.
5. W Supabase dodaj produkcyjny redirect URL.
6. Deploy.

## Bezpieczeństwo

- dostęp do danych wymaga zalogowanego aktywnego profilu,
- RLS jest aktywny dla danych biznesowych,
- dwa prywatne konta mają obecnie wspólny dostęp do workspace,
- sekret Supabase działa tylko po stronie serwera,
- usunięcie klienta jest zastąpione archiwizacją,
- krytyczne zmiany CRUD zapisują się w `audit_logs`.

## Czego świadomie NIE ma jeszcze w v0.1

- aktywnej synchronizacji Google Calendar,
- push notifications / email notifications,
- zaawansowanych ról i uprawnień,
- pipeline sprzedażowego grupówek,
- modułu Call Center / SalesMetrics,
- AI „Zapytaj Salesly”,
- importu klientów CSV/XLSX,
- załączników do klientów.

Te elementy są kolejnymi modułami, nie warunkiem używania rdzenia.

## Zalecana kolejność testu

1. Zaloguj oba konta.
2. Dodaj klienta testowego.
3. Dodaj mu polisę z datą startu i odnowienia.
4. Dodaj osobę kontaktową.
5. Dodaj notatkę do historii.
6. Dodaj follow-up z godziną.
7. Sprawdź Taski i Kalendarz.
8. Sprawdź Odnowienia i rocznice.
9. W Supabase Cron sprawdź historię joba `salesly-os-reminders`.

## Następny sensowny etap

Po uruchomieniu v0.1 na realnych danych: Google Calendar OAuth + dwukierunkowy sync, a dopiero później pipeline sprzedażowy i AI.

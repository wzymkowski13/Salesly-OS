# Salesly OS v1 — plan docelowy

Status: **zaakceptowany kierunek / foundation w implementacji**

## 1. Cel produktu

Salesly OS ma być warstwą nadrzędną, która zbiera pracę i sprawy prywatne w jedno miejsce. Nie zastępuje specjalistycznych narzędzi, ale ma skrócić drogę do nich do 1–2 kliknięć i agregować najważniejsze dane operacyjne.

Model nawigacji:

```
Shell → Workspace → Moduł
```

## 2. Home / Launcher po zalogowaniu

Po zalogowaniu użytkownik trafia na `/home`, a nie bezpośrednio na dashboard służbowy.

Kafelki:
- **Salesly Call Center Panel** → zewnętrznie: https://salesly.pl/panel
- **SalesMetrics** → zewnętrznie: https://salesmetrics-v2.onrender.com/
- **LeadFactory** → moduł wewnętrzny Salesly OS
- **Służbowe** → workspace wewnętrzny
- **Prywatne** → workspace wewnętrzny

Kafelki są docelowo filtrowane na podstawie uprawnień użytkownika.

## 3. Workspaces i nawigacja

### Workspace switcher
W prawym górnym rogu aplikacji znajduje się rozwijany przełącznik środowiska:
- Start
- Służbowe
- Prywatne
- LeadFactory
- SalesMetrics ↗
- Call Center Panel ↗

### Sidebar
Sidebar służy wyłącznie do nawigacji **w obrębie aktualnego workspace**.

#### Służbowe
- Dashboard
- CRM
- Odnowienia
- Zadania
- Kalendarz
- Powiadomienia
- LeadFactory
- Ustawienia

#### Prywatne
- Dashboard
- Zadania
- Kalendarz
- Studia
- Finanse
- Dokumenty
- Ustawienia

#### LeadFactory
Na razie pozostaje obecny moduł i jego dotychczasowe funkcje.

## 4. Służbowe — dashboard

Dashboard służbowy ma pokazywać tylko operacyjne rzeczy potrzebne do pracy:
- zadania dziś,
- spotkania dziś,
- leady dziś,
- efektywność dziś,
- najbliższe odnowienia,
- rocznice,
- aktywni klienci,
- ostatnia aktywność CRM,
- powiadomienia.

SalesMetrics nie jest osadzany na dashboardzie — pozostaje osobnym narzędziem.

### Call Center Panel summary
Docelowo mały endpoint w panelu:
```
GET /api/os-summary
{
  "leads_today": 14,
  "efficiency_today": 0.92
}
```

OS tylko pobiera i prezentuje 2 KPI. Bez przepisywania całego panelu.

## 5. Wspólne Zadania i Kalendarz

Nie budujemy osobnych silników dla pracy i życia prywatnego.

Do tabel `tasks` i `events` dochodzi pole `scope`:
- `work`
- `private`
- `study`
- `leadfactory`

Widoki filtrują dane:
- Służbowe → `work`
- Prywatne → `private + study`
- Studia → `study`

Dzięki temu rekord jest jeden, a widoki są kontekstowe.

## 6. Uprawnienia / skills

Nie opieramy systemu wyłącznie na rolach typu admin/user.

Model:
```
user_permissions
- user_id
- permission_key
- granted_by
- created_at
```

Przykładowe klucze:
- `work.dashboard`
- `work.crm`
- `work.tasks`
- `work.calendar`
- `work.renewals`
- `leadfactory.view`
- `leadfactory.manage`
- `private.dashboard`
- `private.study`
- `private.finance`
- `admin.users`
- `admin.permissions`

Etap foundation tworzy model danych. Panel zarządzania użytkownikami i skillami powstaje w osobnym etapie.

## 7. Prywatne — dashboard

Minimalny dashboard prywatny:
- najbliższe zajęcia,
- najbliższe zaliczenia,
- zadania prywatne / studenckie.

Dodatkowe wejścia:
- Studia
- Finanse
- Dokumenty

## 8. Studia — docelowy moduł

### Przedmioty
Każdy przedmiot:
- nazwa,
- semestr,
- prowadzący,
- ECTS,
- forma zaliczenia,
- termin zaliczenia,
- warunek/próg zaliczenia,
- oceny cząstkowe,
- wagi,
- ocena końcowa,
- automatyczna średnia ważona.

### Zajęcia
Każde zajęcia:
- przedmiot,
- typ: wykład / ćwiczenia / laboratorium / seminarium,
- prowadzący,
- sala,
- start / koniec,
- status: nieoznaczone / obecny / nieobecny / odwołane,
- notatki i materiały.

Frekwencja liczona automatycznie **per przedmiot**.

### Import planu
Priorytet:
1. Google Calendar
2. import `.ics`

Import ICS obsługuje również eksport z Apple Calendar bez osobnej integracji Apple API.

### Google Docs / Drive
Notatki mogą być przypięte:
- do całego przedmiotu,
- do pojedynczych zajęć.

Flow:
`+ Nowa notatka → utworzenie Google Doc → zapis URL i tytułu → otwarcie w nowej karcie`.

## 9. Finanse — docelowy moduł

### Dane
- przychody,
- koszty,
- zobowiązania,
- podatki/ZUS,
- źródła przychodów,
- kategorie kosztów,
- transakcje cykliczne i jednorazowe,
- firmowe / prywatne.

### Źródła przychodów
Np.:
- Salesly,
- Ubezpieczenia,
- Wynagrodzenie,
- Inne.

### Kategorie kosztów
Np.:
- wynagrodzenia,
- software,
- marketing,
- księgowość,
- ZUS,
- podatki,
- telefon/internet,
- podróże,
- prywatne stałe,
- prywatne zmienne.

### Import
Pierwsza wersja: CSV/XLSX z banku.
Później: reguły automatycznej kategoryzacji.

### Profil podatkowy
Konfigurowalne:
- forma opodatkowania,
- PIT,
- VAT,
- ZUS społeczny,
- zdrowotna,
- inne założenia.

System pokazuje **szacowane netto**, nie zastępuje księgowości.

### Analityka
Miesiąc / kwartał / rok:
- przychód,
- koszty,
- dochód,
- szacowane netto,
- średnia miesięczna,
- dynamika m/m,
- dynamika r/r,
- marża,
- struktura przychodów,
- struktura kosztów,
- trend 12M.

## 10. Etapy wdrożenia

### Etap A — Foundation v1
- Home launcher
- workspace switcher
- kontekstowy sidebar
- prywatny workspace
- scope dla tasków i eventów
- model permissions
- usunięcie SalesMetrics z dashboardu służbowego
- zachowanie istniejących funkcji bez regresji

### Etap B — Studia
- [x] tabele i CRUD przedmiotów
- [x] zajęcia
- [x] frekwencja per przedmiot
- [x] ECTS
- [x] oceny / wagi / średnia ważona
- [x] zaliczenia
- [ ] import planu z Google Calendar
- [ ] import ICS
- [ ] notatki Google Docs / Drive

### Etap C — Integracje studiów
- Google Calendar
- ICS import
- Google Drive / Docs

### Etap D — Finanse
- transakcje
- źródła/kategorie
- import CSV/XLSX
- profil podatkowy
- dashboard i analityka

### Etap E — Call Center summary
- prosty endpoint w salesly.pl/panel
- leady dziś
- efektywność dziś

### Etap F — Users & permissions UI
- dodawanie użytkowników
- aktywacja/dezaktywacja
- przypisywanie permission keys
- launcher/sidebar respektujący uprawnienia

## 11. Kryteria foundation v1

Foundation jest gotowy, gdy:
- po loginie użytkownik trafia na Home,
- Home pokazuje 5 głównych wejść,
- Służbowe i Prywatne są odseparowanymi workspace’ami,
- sidebar zmienia się zależnie od workspace,
- workspace switcher działa z każdego modułu,
- zadania i kalendarz mają scope,
- obecne dane automatycznie pozostają w `work`,
- obecny CRM/odnowienia/powiadomienia działają bez zmian,
- SalesMetrics nie miesza się już z dashboardem służbowym.

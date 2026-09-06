# Salesly OS — architektura v0.1

## Zasada główna

CRM jest rdzeniem. Task, wydarzenie, polisa, kontakt i aktywność mogą być powiązane z klientem. Dzięki temu kolejne moduły nie tworzą osobnych silosów danych.

## Encje

- `profiles` — użytkownicy aplikacji,
- `clients` — firma lub osoba,
- `contacts` — osoby kontaktowe klienta,
- `policies` — produkty/polisy,
- `tasks` — zadania i follow-upy,
- `events` — wydarzenia kalendarzowe,
- `activities` — timeline klienta,
- `notifications` — alerty operacyjne,
- `audit_logs` — historia zmian systemowych.

## Odnowienia

Nie duplikujemy danych do osobnej tabeli. `renewal_queue` jest widokiem bazującym na `policies.renewal_date`.

## Rocznice

`anniversary_queue` wylicza kolejną rocznicę z `policies.start_date`, jeśli `annual_review = true`.

## Google Calendar

Tabela `events` ma od początku pola:

- `google_event_id`,
- `google_calendar_id`.

Pozwala to dołożyć sync bez przebudowy modelu kalendarza.

## Kierunek rozwoju

CRM -> Pipeline -> Call Center / SalesMetrics -> AI query/action layer.

## Scheduler przypomnień

Przypomnienia generuje funkcja `public.generate_notifications()` uruchamiana przez Supabase Cron co 15 minut. Nie opieramy tego o Vercel Hobby, ponieważ jego cron jest ograniczony do jednego uruchomienia dziennie; to za słabo dla tasków ustawianych na konkretną godzinę.

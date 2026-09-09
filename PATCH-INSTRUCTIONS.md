# Salesly OS v0.3.2 — interaction polish

Patch przygotowany na bazie aktualnego `main` repozytorium `wzymkowski13/Salesly-OS` (v0.3.1).

## Co poprawia

### Drag & drop
- overlay jest renderowany bezpośrednio do `document.body`, więc nie dziedziczy przesunięć/layoutu panelu,
- zachowywane są rzeczywiste wymiary przeciąganego kafelka,
- poprawka dotyczy kalendarza i tablicy zadań,
- punkt złapania kafelka pozostaje przy kursorze zamiast wizualnego „odjeżdżania”.

### Dodawanie zadań i wydarzeń
- okno dodawania jest teraz kontrolowanym, animowanym popoverem zamiast natywnego `<details>`,
- po zatwierdzeniu formularz zamyka się od razu z krótkim fade/scale,
- zadanie/wydarzenie pojawia się optymistycznie od razu w aktualnym widoku,
- po odpowiedzi Supabase stan synchronizuje się ze świeżymi danymi z serwera,
- nie trzeba odświeżać strony.

### Godzina
- przebudowany picker godziny,
- wybrana wartość jest zawsze jawnie widoczna (`Wybrano 09:00`),
- osobne, czytelne pola godziny i minut,
- szybkie minuty `:00 / :15 / :30 / :45`,
- przy polu opcjonalnym zamiast wyszarzonego pickera jest `Dodaj godzinę`.

## Pliki w patchu

- `components/form-disclosure.tsx`
- `components/ui/time-picker.tsx`
- `components/task-board.tsx`
- `components/calendar-workspace.tsx`
- `app/(app)/tasks/page.tsx`
- `app/(app)/calendar/page.tsx`

Nie ma zmian w Supabase ani migracji SQL.

## Wdrożenie

1. Zrób commit/backup aktualnej wersji.
2. Rozpakuj ZIP.
3. Skopiuj katalogi `components` i `app` z patcha do katalogu projektu, zgadzając się na nadpisanie tych 6 plików.
4. Lokalnie:

```bash
npm run dev
```

5. Sprawdź:
   - drag & drop zadania między statusami,
   - drag & drop wydarzenia między dniami,
   - dodanie zadania z godziną,
   - dodanie zadania bez godziny,
   - dodanie wydarzenia.
6. Jeśli jest OK:

```bash
git add .
git commit -m "Fix drag drop and quick create interactions"
git push
```

Vercel zrobi redeploy automatycznie.

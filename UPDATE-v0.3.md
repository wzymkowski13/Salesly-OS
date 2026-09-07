# Salesly OS v0.3 — aktualizacja z v0.2.1

Ta wersja nie wymaga żadnej migracji Supabase.

## Co się zmienia

1. Zadania reagują optymistycznie — zmiana statusu jest widoczna od razu.
2. Zadania można przeciągać między kolumnami.
3. Kliknięcie zadania otwiera pełny modal z edycją.
4. Pozycje kalendarza można kliknąć i edytować.
5. Pozycje kalendarza można przeciągać na inny dzień.
6. Native `input type=time` został zastąpiony wygodniejszym pickerem czasu.
7. Dodane zostały mikroanimacje, animowane modale, przejścia stron i loading state.

## Aktualizacja

1. Zrób kopię działającego folderu projektu.
2. Skopiuj pliki v0.3 nad obecną wersję.
3. Zachowaj swój `.env.local` oraz folder `.git`.
4. W katalogu projektu uruchom:

```bash
npm install
npm run dev
```

`npm install` jest potrzebne, ponieważ v0.3 dodaje `@dnd-kit/core`.

## Test po aktualizacji

- przeciągnij zadanie z „Do zrobienia” do „W trakcie”,
- oznacz zadanie jako „Gotowe” i sprawdź, czy przechodzi natychmiast,
- kliknij kartę zadania i zmień termin/godzinę/opis,
- kliknij wydarzenie w kalendarzu i edytuj je,
- przeciągnij wydarzenie na inny dzień,
- sprawdź nowy wybór czasu w formularzu wydarzenia.

## Deploy

Jeśli test lokalny przejdzie:

```bash
git add .
git commit -m "Salesly OS v0.3 interactions"
git push
```

Vercel pobierze nową zależność i zrobi redeploy automatycznie.

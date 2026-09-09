# Salesly OS - poprawka formularza zadania / picker godziny

Patch obejmuje tylko 2 pliki:

- `components/ui/time-picker.tsx`
- `app/(app)/tasks/page.tsx`

## Co zmienia

- formularz dodawania zadania przechodzi z 4 do 3 kolumn na dużym ekranie,
- picker godziny ma więcej miejsca i nie wypycha elementów poza panel,
- usunięty został redundantny wiersz `Wybrano 17:00`,
- szybkie minuty `:00 / :15 / :30 / :45` mieszczą się zawsze w szerokości pola,
- przycisk usunięcia godziny jest wewnątrz pola zamiast jako osobny duży kafelek,
- sekcja przypomnienia dostaje 2 kolumny szerokości na desktopie.

## Wdrożenie

Skopiuj zawartość paczki nad aktualny projekt, zachowując `.env.local` i `.git`.

Potem:

```bash
npm run dev
```

Jeśli wygląda dobrze:

```bash
git add .
git commit -m "Polish task time picker layout"
git push
```

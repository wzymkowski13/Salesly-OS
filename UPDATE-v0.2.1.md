# Salesly OS v0.2.1 — visual polish

Ta wersja jest czystym UI/UX passem na bazie v0.2. Nie zmienia schematu Supabase i nie wymaga nowych migracji.

## Najważniejsze zmiany

- sidebar zmieniony z ciężkiego ciemnego panelu na lekki, chłodny panel operacyjny,
- logo Salesly jest czytelne bez dodatkowej obróbki,
- aktywna pozycja ma miękkie niebieskie tło + subtelny rail po lewej,
- nieaktywne pozycje mają wyższy kontrast i czytelny hover,
- główny brand blue został dopasowany bliżej koloru z logo Salesly,
- przyciski primary/secondary/soft mają spójniejszy kontrast, hover i cień,
- stat cards dostały subtelne kolorowe znaczniki zamiast dokładania ciężkich teł,
- topbar, mobile nav i formularze korzystają z tej samej palety,
- kalendarz ma lżejszy grid, delikatne wyróżnienie bieżącego dnia i eventy z kolorowym lewym akcentem,
- przełącznik Dzień / Tydzień / Miesiąc nie używa już ciężkiego zaznaczenia.

## Aktualizacja z v0.2

1. Zrób kopię obecnego projektu.
2. Nadpisz pliki zawartością folderu `salesly-os-v0.2.1`.
3. Zachowaj własny `.env.local` i folder `.git`.
4. Uruchom lokalnie:

```bash
npm run dev
```

5. Jeśli jest OK:

```bash
git add .
git commit -m "Salesly OS v0.2.1 visual polish"
git push
```

Vercel wdroży aktualizację automatycznie.

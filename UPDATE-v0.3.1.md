# Salesly OS v0.3.1 — drag & drop polish

Ta poprawka nie wymaga żadnej migracji Supabase ani zmian w `.env.local`.

## Co poprawiono

### Kalendarz
- target dnia jest teraz wybierany na podstawie położenia kursora (`pointerWithin`), a nie środka przeciąganego elementu,
- overlay podczas drag & drop zachowuje szerokość oryginalnego wydarzenia/zadania,
- usunięto podwójne wizualne przesuwanie źródłowego elementu,
- drag overlay jest krótszy i mniej „odklejony” od kursora,
- w praktyce upuszczasz pozycję w dniu, nad którym faktycznie znajduje się kursor.

### Zadania
- cała karta zadania jest teraz draggable — nie trzeba trafiać w mały uchwyt,
- uchwyt został zostawiony jako czytelna wskazówka wizualna,
- przyciski wewnątrz karty nadal działają normalnie i nie rozpoczynają przeciągania,
- kolumna docelowa jest wykrywana na podstawie położenia kursora,
- zachowany jest optimistic UI: po upuszczeniu karta natychmiast zmienia status, zapis do Supabase odbywa się w tle.

## Aktualizacja

1. Zrób kopię działającego projektu.
2. Skopiuj pliki v0.3.1 nad obecną wersję v0.3.
3. Zachowaj `.env.local` i `.git`.
4. Nie trzeba dodawać nowych zależności ponad te z v0.3.
5. Uruchom lokalnie:

```bash
npm install
npm run dev
```

## Test

- w Zadaniach złap kartę w dowolnym pustym miejscu i przenieś ją do innej kolumny,
- sprawdź przejścia między wszystkimi 4 statusami,
- w kalendarzu złap wydarzenie dokładnie z lewej/prawej części karty i przenieś je kilka dni dalej,
- upewnij się, że aktywnym dniem jest teraz dzień pod kursorem, a nie dzień znajdujący się pod środkiem karty.

Po teście:

```bash
git add .
git commit -m "Salesly OS v0.3.1 drag drop polish"
git push
```

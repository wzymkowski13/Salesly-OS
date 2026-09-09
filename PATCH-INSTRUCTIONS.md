# Salesly OS v0.3.3 - interaction fixes

Patch jest przygotowany pod aktualny `main` repozytorium Salesly-OS.

## Co poprawia

1. Drag & drop
   - DragOverlay jest renderowany przez portal do `document.body`, poza layoutem aplikacji.
   - usunięte zostały transformacje hover z elementów przeciąganych,
   - animacja kart nie zostawia po sobie `transform`, który potrafił rozjeżdżać współrzędne DnD.

2. Dodawanie zadań i wydarzeń
   - formularz zamyka się płynnie natychmiast po submit,
   - zadanie/wydarzenie pojawia się optymistycznie od razu,
   - po odpowiedzi Server Action dane synchronizują się ze świeżymi propsami bez F5.

3. Godzina zadania
   - po włączeniu godziny picker pokazuje wybraną wartość,
   - wartość `due_time` jest dodawana do optymistycznego kafelka, więc po utworzeniu od razu widać np. `16:15`.

4. Usuwanie
   - zadanie można usunąć z modala edycji,
   - wydarzenie można usunąć z modala kalendarza,
   - zadanie otwarte z kalendarza można usunąć również z kalendarza,
   - przed kasowaniem jest potwierdzenie.

## Pliki do podmiany

Skopiuj zawartość ZIP-a do katalogu głównego projektu, zachowując strukturę folderów.

Podmieniane pliki:

- `app/globals.css`
- `app/(app)/tasks/page.tsx`
- `app/(app)/calendar/page.tsx`
- `components/form-disclosure.tsx`
- `components/task-board.tsx`
- `components/calendar-workspace.tsx`
- `components/ui/time-picker.tsx`
- `lib/actions/tasks.ts`
- `lib/actions/events.ts`

Nie ruszaj `.env.local` ani Supabase. Nie ma migracji SQL.

## Test lokalny

```bash
npm run dev
```

Sprawdź po kolei:

1. Dodaj zadanie z datą i godziną - panel ma zniknąć od razu, a kafelek ma pojawić się bez F5 i pokazać godzinę.
2. Dodaj wydarzenie - analogicznie ma wejść od razu do kalendarza.
3. Przeciągnij zadanie między kolumnami.
4. Przeciągnij wydarzenie na inny dzień w kalendarzu.
5. Otwórz zadanie i kliknij `Usuń`.
6. Otwórz wydarzenie i kliknij `Usuń`.

## Deploy

Przed commitem warto sprawdzić, czy Git faktycznie widzi patch:

```bash
git status
git diff --stat
```

Powinno być zmienionych 9 plików z listy wyżej.

Następnie:

```bash
git add .
git commit -m "Fix task and calendar interactions"
git push
```

Vercel powinien automatycznie zrobić nowy deployment.

# Aktualizacja Salesly OS v0.1 -> v0.2

Nie ma zmian w bazie Supabase ani nowych zmiennych środowiskowych.

## Najprostsza aktualizacja

1. Zrób kopię swojego obecnego folderu projektu.
2. Nie usuwaj lokalnego `.env.local` ani folderu `.git`.
3. Skopiuj zawartość paczki v0.2 do katalogu projektu i pozwól nadpisać istniejące pliki.
4. Upewnij się, że w `public/` znajduje się `salesly-logo.png`.
5. Lokalnie uruchom:

```bash
npm run dev
```

6. Po krótkim teście:

```bash
git add .
git commit -m "Salesly OS v0.2 UI UX refresh"
git push
```

7. Vercel automatycznie wdroży nową wersję.

## Supabase

Nic nie uruchamiaj w SQL Editorze. v0.2 korzysta z tego samego schematu danych co działające v0.1.

## Cofnięcie zmian

Jeśli coś pójdzie nie tak, najłatwiej cofnąć commit w Git albo wrócić do poprzedniego deploymentu w Vercel.

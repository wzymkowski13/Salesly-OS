# Salesly OS – logo update

Ten patch podmienia domyślne logo aplikacji na nowe `Salesly OS` oraz usuwa zdublowane oznaczenie `OS` obok logotypu w sidebarze, topbarze mobilnym i na ekranie logowania.

## Co zawiera
- `public/salesly-logo.png` – nowy logotyp Salesly OS z przezroczystym tłem
- `components/sidebar.tsx`
- `components/topbar.tsx`
- `app/(auth)/login/page.tsx`

## Dlaczego w załączonym JPG było czarne tło?
Bo **JPG/JPEG nie obsługuje przezroczystości**. Tło zostało więc spłaszczone do czerni. W tym patchu logotyp został zapisany jako **PNG z przezroczystością**, więc na jasnym UI będzie wyglądał poprawnie.

## Jak wdrożyć
1. Zrób backup obecnego projektu.
2. Rozpakuj paczkę nad aktualny projekt.
3. Zachowaj `.git` i `.env.local`.
4. Uruchom lokalnie:

```bash
npm run dev
```

5. Jeśli wygląda dobrze:

```bash
git add .
git commit -m "Update default Salesly OS logo"
git push
```

Vercel zrobi redeploy automatycznie.

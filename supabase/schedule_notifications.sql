-- First enable Supabase Cron (pg_cron) in Dashboard -> Integrations -> Cron.
-- Then run this file once in SQL Editor.

select cron.schedule(
  'salesly-os-reminders',
  '*/15 * * * *',
  $$select public.generate_notifications();$$
);

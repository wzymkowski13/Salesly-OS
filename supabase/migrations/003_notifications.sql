create or replace function public.generate_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_today date := (now() at time zone 'Europe/Warsaw')::date;
begin
  -- Explicit task reminders.
  insert into public.notifications(user_id, notification_type, title, body, href, dedupe_key)
  select
    t.assigned_to,
    'task'::public.notification_type,
    'Przypomnienie: ' || t.title,
    'Ustawione przypomnienie do taska.',
    case when t.client_id is not null then '/crm/' || t.client_id::text else '/tasks' end,
    'task-reminder:' || t.id::text || ':' || t.reminder_at::text
  from public.tasks t
  where t.status <> 'done'
    and t.assigned_to is not null
    and t.reminder_at is not null
    and t.reminder_at <= now()
  on conflict (user_id, dedupe_key) do nothing;

  -- One reminder on the due date.
  insert into public.notifications(user_id, notification_type, title, body, href, dedupe_key)
  select
    t.assigned_to,
    'task'::public.notification_type,
    'Na dziś: ' || t.title,
    case when t.due_time is not null then 'Termin ' || to_char(t.due_time, 'HH24:MI') || '.' else 'Termin przypada dzisiaj.' end,
    case when t.client_id is not null then '/crm/' || t.client_id::text else '/tasks' end,
    'task-due:' || t.id::text || ':' || t.due_date::text
  from public.tasks t
  where t.status <> 'done'
    and t.assigned_to is not null
    and t.due_date = local_today
  on conflict (user_id, dedupe_key) do nothing;

  -- Renewals: 60 / 30 / 14 / 7 / 1 / 0 days. If no owner, notify all active users.
  insert into public.notifications(user_id, notification_type, title, body, href, dedupe_key)
  select
    target.user_id,
    'renewal'::public.notification_type,
    'Odnowienie: ' || c.name,
    coalesce(p.product_name, p.category::text) || ' — ' ||
      case when (p.renewal_date - local_today) = 0 then 'dzisiaj.' else 'za ' || (p.renewal_date - local_today)::text || ' dni.' end,
    '/crm/' || c.id::text,
    'renewal:' || p.id::text || ':' || p.renewal_date::text || ':' || (p.renewal_date - local_today)::text
  from public.policies p
  join public.clients c on c.id = p.client_id and c.archived_at is null
  join lateral (
    select c.owner_id as user_id where c.owner_id is not null
    union all
    select pr.id from public.profiles pr where c.owner_id is null and pr.is_active = true
  ) target on true
  where p.renewal_date is not null
    and (p.renewal_date - local_today) in (60, 30, 14, 7, 1, 0)
  on conflict (user_id, dedupe_key) do nothing;

  -- Annual review anniversaries: 30 / 14 / 7 / 1 / 0 days.
  insert into public.notifications(user_id, notification_type, title, body, href, dedupe_key)
  select
    target.user_id,
    'anniversary'::public.notification_type,
    'Rocznica: ' || a.client_name,
    coalesce(a.product_name, a.category::text) || ' — ' ||
      case when a.days_left = 0 then 'dzisiaj.' else 'za ' || a.days_left::text || ' dni.' end,
    '/crm/' || a.client_id::text,
    'anniversary:' || a.policy_id::text || ':' || a.anniversary_date::text || ':' || a.days_left::text
  from public.anniversary_queue a
  join lateral (
    select a.owner_id as user_id where a.owner_id is not null
    union all
    select pr.id from public.profiles pr where a.owner_id is null and pr.is_active = true
  ) target on true
  where a.days_left in (30, 14, 7, 1, 0)
  on conflict (user_id, dedupe_key) do nothing;
end;
$$;

revoke all on function public.generate_notifications() from public;

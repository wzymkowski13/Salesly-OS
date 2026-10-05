-- Salesly OS / Performance indexes pass 1
-- Safe composite indexes for the filters used most often by dashboards,
-- task/calendar workspaces and notification counters.

create index if not exists tasks_assignee_scope_due_open_idx
  on public.tasks(assigned_to, scope, due_date, due_time)
  where status <> 'done';

create index if not exists events_scope_starts_idx
  on public.events(scope, starts_at);

create index if not exists notifications_unread_recent_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;

create index if not exists activities_recent_idx
  on public.activities(occurred_at desc);

create index if not exists clients_active_status_name_idx
  on public.clients(status, name)
  where archived_at is null;

create index if not exists study_subjects_active_pass_idx
  on public.study_subjects(user_id, pass_date)
  where archived_at is null and pass_date is not null;

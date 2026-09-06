create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  row_id uuid;
begin
  if tg_op = 'DELETE' then
    row_data := to_jsonb(old);
    row_id := old.id;
  else
    row_data := to_jsonb(new);
    row_id := new.id;
  end if;

  insert into public.audit_logs(actor_id, entity_type, entity_id, action, snapshot)
  values (auth.uid(), tg_table_name, row_id, lower(tg_op), row_data);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.write_audit_log() from public;

create trigger audit_clients after insert or update or delete on public.clients for each row execute function public.write_audit_log();
create trigger audit_contacts after insert or update or delete on public.contacts for each row execute function public.write_audit_log();
create trigger audit_policies after insert or update or delete on public.policies for each row execute function public.write_audit_log();
create trigger audit_tasks after insert or update or delete on public.tasks for each row execute function public.write_audit_log();
create trigger audit_events after insert or update or delete on public.events for each row execute function public.write_audit_log();

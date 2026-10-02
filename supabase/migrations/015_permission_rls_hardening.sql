-- Salesly OS / Permission-aware RLS hardening
-- Apply after 014_users_permissions_onboarding.sql.

do $block$
declare
  p record;
begin
  for p in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'clients',
        'contacts',
        'policies',
        'tasks',
        'events',
        'activities',
        'audit_logs',
        'study_subjects',
        'study_classes',
        'study_grades',
        'study_notes',
        'usos_sync_runs',
        'finance_sources',
        'finance_categories',
        'finance_transactions',
        'finance_import_batches',
        'finance_tax_profiles',
        'finance_classification_rules'
      )
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end
$block$;

-- Profiles: everybody can always read their own profile.
-- Work users can read the directory where assignment selectors need it.
create policy profiles_access
on public.profiles
for select
to authenticated
using (
  public.is_active_app_user()
  and (
    id = auth.uid()
    or public.has_permission('work.crm')
    or public.has_permission('work.tasks')
    or public.has_permission('work.calendar')
  )
);

-- CRM / renewals.
create policy clients_read_access
on public.clients
for select
to authenticated
using (
  public.is_active_app_user()
  and (
    public.has_permission('work.crm')
    or public.has_permission('work.dashboard')
    or public.has_permission('work.renewals')
    or public.has_permission('work.tasks')
    or public.has_permission('work.calendar')
  )
);

create policy clients_crm_write
on public.clients
for all
to authenticated
using (public.is_active_app_user() and public.has_permission('work.crm'))
with check (public.is_active_app_user() and public.has_permission('work.crm'));

create policy contacts_crm_access
on public.contacts
for all
to authenticated
using (public.is_active_app_user() and public.has_permission('work.crm'))
with check (public.is_active_app_user() and public.has_permission('work.crm'));

create policy policies_read_access
on public.policies
for select
to authenticated
using (
  public.is_active_app_user()
  and (
    public.has_permission('work.crm')
    or public.has_permission('work.dashboard')
    or public.has_permission('work.renewals')
  )
);

create policy policies_crm_write
on public.policies
for all
to authenticated
using (public.is_active_app_user() and public.has_permission('work.crm'))
with check (public.is_active_app_user() and public.has_permission('work.crm'));

create policy activities_read_access
on public.activities
for select
to authenticated
using (
  public.is_active_app_user()
  and (
    public.has_permission('work.crm')
    or public.has_permission('work.dashboard')
  )
);

create policy activities_crm_write
on public.activities
for all
to authenticated
using (public.is_active_app_user() and public.has_permission('work.crm'))
with check (public.is_active_app_user() and public.has_permission('work.crm'));

-- Tasks: work tasks are shared inside the work workspace.
-- Private/study tasks are visible only to creator/assignee.
create policy tasks_select_access
on public.tasks
for select
to authenticated
using (
  public.is_active_app_user()
  and (
    (
      scope = 'work'
      and (
        public.has_permission('work.tasks')
        or public.has_permission('work.dashboard')
        or public.has_permission('work.calendar')
      )
    )
    or
    (
      scope in ('private','study')
      and public.has_permission('private.tasks')
      and (assigned_to = auth.uid() or created_by = auth.uid())
    )
  )
);

create policy tasks_insert_access
on public.tasks
for insert
to authenticated
with check (
  public.is_active_app_user()
  and (
    (scope = 'work' and public.has_permission('work.tasks'))
    or
    (
      scope in ('private','study')
      and public.has_permission('private.tasks')
      and (assigned_to = auth.uid() or created_by = auth.uid())
    )
  )
);

create policy tasks_update_access
on public.tasks
for update
to authenticated
using (
  public.is_active_app_user()
  and (
    (scope = 'work' and public.has_permission('work.tasks'))
    or
    (
      scope in ('private','study')
      and public.has_permission('private.tasks')
      and (assigned_to = auth.uid() or created_by = auth.uid())
    )
  )
)
with check (
  public.is_active_app_user()
  and (
    (scope = 'work' and public.has_permission('work.tasks'))
    or
    (
      scope in ('private','study')
      and public.has_permission('private.tasks')
      and (assigned_to = auth.uid() or created_by = auth.uid())
    )
  )
);

create policy tasks_delete_access
on public.tasks
for delete
to authenticated
using (
  public.is_active_app_user()
  and (
    (scope = 'work' and public.has_permission('work.tasks'))
    or
    (
      scope in ('private','study')
      and public.has_permission('private.tasks')
      and (assigned_to = auth.uid() or created_by = auth.uid())
    )
  )
);

-- Events follow the same shared-work / private-owner split.
create policy events_select_access
on public.events
for select
to authenticated
using (
  public.is_active_app_user()
  and (
    (
      scope = 'work'
      and (
        public.has_permission('work.calendar')
        or public.has_permission('work.dashboard')
      )
    )
    or
    (
      scope in ('private','study')
      and public.has_permission('private.calendar')
      and created_by = auth.uid()
    )
  )
);

create policy events_insert_access
on public.events
for insert
to authenticated
with check (
  public.is_active_app_user()
  and (
    (scope = 'work' and public.has_permission('work.calendar'))
    or
    (
      scope in ('private','study')
      and public.has_permission('private.calendar')
      and created_by = auth.uid()
    )
  )
);

create policy events_update_access
on public.events
for update
to authenticated
using (
  public.is_active_app_user()
  and (
    (scope = 'work' and public.has_permission('work.calendar'))
    or
    (
      scope in ('private','study')
      and public.has_permission('private.calendar')
      and created_by = auth.uid()
    )
  )
)
with check (
  public.is_active_app_user()
  and (
    (scope = 'work' and public.has_permission('work.calendar'))
    or
    (
      scope in ('private','study')
      and public.has_permission('private.calendar')
      and created_by = auth.uid()
    )
  )
);

create policy events_delete_access
on public.events
for delete
to authenticated
using (
  public.is_active_app_user()
  and (
    (scope = 'work' and public.has_permission('work.calendar'))
    or
    (
      scope in ('private','study')
      and public.has_permission('private.calendar')
      and created_by = auth.uid()
    )
  )
);

-- Audit log is administrative.
create policy audit_admin_read
on public.audit_logs
for select
to authenticated
using (
  public.is_active_app_user()
  and public.has_permission('admin.permissions')
);

-- Study data: user-owned AND module permission.
create policy study_subjects_access
on public.study_subjects
for all
to authenticated
using (
  public.is_active_app_user()
  and public.has_permission('private.study')
  and user_id = auth.uid()
)
with check (
  public.is_active_app_user()
  and public.has_permission('private.study')
  and user_id = auth.uid()
);

create policy study_classes_access
on public.study_classes
for all
to authenticated
using (
  public.is_active_app_user()
  and public.has_permission('private.study')
  and user_id = auth.uid()
)
with check (
  public.is_active_app_user()
  and public.has_permission('private.study')
  and user_id = auth.uid()
);

create policy study_grades_access
on public.study_grades
for all
to authenticated
using (
  public.is_active_app_user()
  and public.has_permission('private.study')
  and user_id = auth.uid()
)
with check (
  public.is_active_app_user()
  and public.has_permission('private.study')
  and user_id = auth.uid()
);

create policy study_notes_access
on public.study_notes
for all
to authenticated
using (
  public.is_active_app_user()
  and public.has_permission('private.study')
  and user_id = auth.uid()
)
with check (
  public.is_active_app_user()
  and public.has_permission('private.study')
  and user_id = auth.uid()
);

create policy usos_sync_runs_access
on public.usos_sync_runs
for select
to authenticated
using (
  public.is_active_app_user()
  and public.has_permission('private.study')
  and user_id = auth.uid()
);

-- Finance data: user-owned AND module permission.
create policy finance_sources_access
on public.finance_sources
for all
to authenticated
using (
  public.is_active_app_user()
  and public.has_permission('private.finance')
  and user_id = auth.uid()
)
with check (
  public.is_active_app_user()
  and public.has_permission('private.finance')
  and user_id = auth.uid()
);

create policy finance_categories_access
on public.finance_categories
for all
to authenticated
using (
  public.is_active_app_user()
  and public.has_permission('private.finance')
  and user_id = auth.uid()
)
with check (
  public.is_active_app_user()
  and public.has_permission('private.finance')
  and user_id = auth.uid()
);

create policy finance_transactions_access
on public.finance_transactions
for all
to authenticated
using (
  public.is_active_app_user()
  and public.has_permission('private.finance')
  and user_id = auth.uid()
)
with check (
  public.is_active_app_user()
  and public.has_permission('private.finance')
  and user_id = auth.uid()
);

create policy finance_import_batches_access
on public.finance_import_batches
for all
to authenticated
using (
  public.is_active_app_user()
  and public.has_permission('private.finance')
  and user_id = auth.uid()
)
with check (
  public.is_active_app_user()
  and public.has_permission('private.finance')
  and user_id = auth.uid()
);

create policy finance_tax_profiles_access
on public.finance_tax_profiles
for all
to authenticated
using (
  public.is_active_app_user()
  and public.has_permission('private.finance')
  and user_id = auth.uid()
)
with check (
  public.is_active_app_user()
  and public.has_permission('private.finance')
  and user_id = auth.uid()
);

create policy finance_classification_rules_access
on public.finance_classification_rules
for all
to authenticated
using (
  public.is_active_app_user()
  and public.has_permission('private.finance')
  and user_id = auth.uid()
)
with check (
  public.is_active_app_user()
  and public.has_permission('private.finance')
  and user_id = auth.uid()
);

-- Require a real, confirmed company email at the database boundary. The
-- auth.users lookup stays inside this narrowly scoped SECURITY DEFINER helper
-- so authenticated clients do not need direct access to the Auth schema.
create or replace function public.dashboard_has_verified_company_email()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from auth.users as u
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and lower(u.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      and lower(u.email) like '%@interiorsolutions.net'
  );
$function$;

revoke all on function public.dashboard_has_verified_company_email() from public;
revoke all on function public.dashboard_has_verified_company_email() from anon;
grant execute on function public.dashboard_has_verified_company_email() to authenticated;

drop policy if exists "employee reads own assignee mapping"
  on public.dashboard_assignee_directory;

create policy "employee reads own assignee mapping"
  on public.dashboard_assignee_directory
  for select
  to authenticated
  using (
    (select public.dashboard_has_verified_company_email())
    and lower(company_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

drop policy if exists "employee reads assigned project records"
  on public.project_records;

create policy "employee reads assigned project records"
  on public.project_records
  for select
  to authenticated
  using (
    (select public.dashboard_has_verified_company_email())
    and lower(coalesce((select auth.jwt() ->> 'email'), '')) like '%@interiorsolutions.net'
    and (
      lower(btrim(assigned_to)) = lower((select auth.jwt() ->> 'email'))
      or exists (
        select 1
        from public.dashboard_assignee_directory as d
        where d.assignee_name = project_records.assigned_to
          and lower(d.company_email) = lower((select auth.jwt() ->> 'email'))
      )
    )
  );

# Project dashboard

This dashboard reads `public.project_records` through Supabase Auth and the
Supabase Data API. The database permits a signed-in user with a verified
`@interiorsolutions.net` email to read only records assigned to that email or
to a name linked to that email in `public.dashboard_assignee_directory`. The
dashboard is read-only and does not require authenticator-app MFA.

## Assigning new records

When writing a record, put the assignee's full company email address in
`project_records.assigned_to`, for example `employee@interiorsolutions.net`.
Records with no assignee, an unknown name, or a nonmatching email remain hidden.
Existing name-based assignments require an administrator-maintained mapping in
`dashboard_assignee_directory`; do not infer a person's email from their name.
The existing project record table is append-only, so corrections follow that
table's existing record and trigger rules.

## Rotating the registration access code

Generate a new, random code and run the following in the Supabase SQL Editor as
an authorized administrator, replacing the placeholder with the new code:

```sql
update public.dashboard_access_code_config
set code_hash = extensions.digest(convert_to('REPLACE_WITH_NEW_RANDOM_CODE', 'UTF8'), 'sha256'),
    updated_at = now()
where singleton = true;
```

Use uppercase letters and numbers so it matches the registration form. Share
the new code with intended registrants through an appropriate private channel.
Never commit a real code to this repository. New registration requests must use
the new code; a previously approved registration can still be completed for up
to five minutes. Existing accounts do not need the code to sign in.

Registration uses a project-wide trigger for new `@interiorsolutions.net`
accounts, so the access code requirement also affects other sign-up flows
connected to this Supabase Auth project.

## Confirmation email delivery

This project currently uses Supabase's default email sender. Supabase restricts
that sender to organization team members and limits its delivery rate, so it
cannot onboard the full employee group. Configure a suitable custom SMTP
provider in Supabase Authentication → Emails → SMTP Settings before rolling
out registration. Keep the SMTP password out of this repository and enter it
only in the provider's configuration. Leave email confirmation enabled: the
database uses the verified company email to identify an employee.

## Database policy update

Apply `supabase/migrations/20261112000000_verified_employee_read_policies.sql`
in the Supabase SQL Editor when updating an existing project. It replaces the
two employee read policies so they no longer require AAL2, while continuing to
check the confirmed company email and each person's direct or mapped assignment.
The helper reads `auth.users` without exposing that schema to dashboard users.
The current `project_records` grants already give `authenticated` SELECT only;
anonymous SELECT and authenticated writes are denied.

## Build and deployment

The `live-dashboard` folder contains the React source and pinned dependencies.
Run `npm ci` followed by `npm run build` from that folder. The Vercel project
currently receives manual deployments, and GitHub pushes do not deploy it
automatically. The separate `backend-test.html` file in the repository is the
current sign-in and registration page; both it and the built dashboard need to
be included when deploying.

-- CareConnect PostgreSQL schema for Supabase
-- IMPORTANT: Review and test policies in a non-production project before storing real client data.
create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'counsellor', 'client');
create type public.appointment_status as enum ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'client',
  centre_id uuid,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.centres (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.profiles add constraint profiles_centre_fk foreign key (centre_id) references public.centres(id) on delete set null;

create table public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  centre_id uuid not null references public.centres(id) on delete cascade,
  assigned_counsellor uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  status text not null default 'active' check (status in ('active','awaiting_intake','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres(id) on delete cascade,
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  counsellor_id uuid not null references public.profiles(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  session_type text not null default 'follow_up',
  status public.appointment_status not null default 'pending',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_time_valid check (ends_at > starts_at)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  centre_id uuid references public.centres(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  created_at timestamptz not null default now()
);

create index appointments_centre_start_idx on public.appointments(centre_id, starts_at);
create index appointments_counsellor_start_idx on public.appointments(counsellor_id, starts_at);
create index client_profiles_centre_name_idx on public.client_profiles(centre_id, full_name);
create index audit_events_centre_created_idx on public.audit_events(centre_id, created_at desc);

-- Role lookup helper. SECURITY DEFINER avoids recursive profile RLS checks; restrict its use to policies.
create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.current_centre_id()
returns uuid language sql stable security definer set search_path = public
as $$ select centre_id from public.profiles where id = auth.uid() $$;

alter table public.profiles enable row level security;
alter table public.centres enable row level security;
alter table public.client_profiles enable row level security;
alter table public.appointments enable row level security;
alter table public.audit_events enable row level security;

-- Profiles: a user can read their own profile; centre admins can read profiles in their centre.
create policy "profile_read_self_or_centre_admin" on public.profiles for select to authenticated
using (id = auth.uid() or (public.current_app_role() = 'admin' and centre_id = public.current_centre_id()));
create policy "profile_update_self_basic" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid() and role = public.current_app_role());

-- Centres: members can read their own centre; creation/onboarding should be controlled server-side.
create policy "centre_read_member" on public.centres for select to authenticated
using (id = public.current_centre_id());

-- Client directory: admins can manage all centre clients; counsellors can access assigned clients;
-- clients can read their own linked profile. No client-side INSERT policy is intentionally provided.
create policy "client_read_scoped" on public.client_profiles for select to authenticated
using (
  centre_id = public.current_centre_id() and (
    public.current_app_role() = 'admin' or
    (public.current_app_role() = 'counsellor' and assigned_counsellor = auth.uid()) or
    auth_user_id = auth.uid()
  )
);
create policy "client_insert_admin" on public.client_profiles for insert to authenticated
with check (public.current_app_role() = 'admin' and centre_id = public.current_centre_id());
create policy "client_update_admin_or_assigned_counsellor" on public.client_profiles for update to authenticated
using (centre_id = public.current_centre_id() and (public.current_app_role() = 'admin' or (public.current_app_role() = 'counsellor' and assigned_counsellor = auth.uid())))
with check (centre_id = public.current_centre_id() and (public.current_app_role() = 'admin' or (public.current_app_role() = 'counsellor' and assigned_counsellor = auth.uid())));
create policy "client_delete_admin" on public.client_profiles for delete to authenticated
using (public.current_app_role() = 'admin' and centre_id = public.current_centre_id());

-- Appointments: admin sees centre schedule, counsellor sees assigned sessions, client sees their own sessions.
create policy "appointment_read_scoped" on public.appointments for select to authenticated
using (
  centre_id = public.current_centre_id() and (
    public.current_app_role() = 'admin' or
    (public.current_app_role() = 'counsellor' and counsellor_id = auth.uid()) or
    exists (select 1 from public.client_profiles cp where cp.id = client_id and cp.auth_user_id = auth.uid())
  )
);
create policy "appointment_insert_scoped" on public.appointments for insert to authenticated
with check (
  centre_id = public.current_centre_id() and created_by = auth.uid() and
  (public.current_app_role() = 'admin' or (public.current_app_role() = 'counsellor' and counsellor_id = auth.uid()))
);
create policy "appointment_update_scoped" on public.appointments for update to authenticated
using (centre_id = public.current_centre_id() and (public.current_app_role() = 'admin' or (public.current_app_role() = 'counsellor' and counsellor_id = auth.uid())))
with check (centre_id = public.current_centre_id() and (public.current_app_role() = 'admin' or (public.current_app_role() = 'counsellor' and counsellor_id = auth.uid())));
create policy "appointment_delete_admin" on public.appointments for delete to authenticated
using (public.current_app_role() = 'admin' and centre_id = public.current_centre_id());

-- Audit events are read-only to workspace admins in this starter schema. Write events through a trusted server/trigger.
create policy "audit_read_admin" on public.audit_events for select to authenticated
using (centre_id = public.current_centre_id() and public.current_app_role() = 'admin');

-- Production checklist: test all policies with separate admin/counsellor/client test accounts;
-- add trusted onboarding functions, audit triggers, retention/deletion workflows, backups and rate limits.
-- Never place a Supabase service_role key in browser code.

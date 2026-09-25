-- FerixCourse MVP schema (Phase 1). Keep simple, UUIDs, FKs, indexes.
create extension if not exists "pgcrypto";

-- profiles mirrors supabase auth.users.id
create table if not exists profiles (
  id uuid primary key,
  email text unique not null,
  full_name text not null,
  role text not null default 'STUDENT' check (role in ('STUDENT','ADMIN','INSTRUCTOR')),
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  category_id uuid references categories(id),
  level text not null default 'Beginner' check (level in ('Beginner','Intermediate','Advanced')),
  short_description text not null default '',
  description text not null default '',
  price_kobo integer not null default 0,
  currency text not null default 'NGN',
  is_published boolean not null default false,
  cover_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_courses_published on courses(is_published);
create index if not exists idx_courses_category on courses(category_id);

create table if not exists course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references course_sections(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  video_key text,
  duration_sec integer not null default 0,
  is_free_preview boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists classrooms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text not null default '',
  level text not null default 'Beginner',
  price_kobo integer not null default 0,
  currency text not null default 'NGN',
  capacity integer not null default 30,
  starts_at timestamptz,
  ends_at timestamptz,
  schedule_text text not null default '',
  is_published boolean not null default false,
  livekit_room text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_type text not null check (product_type in ('classroom','course','one_on_one','registration')),
  product_id uuid not null,
  created_at timestamptz not null default now(),
  unique(user_id, product_type, product_id)
);
create index if not exists idx_enrollments_user on enrollments(user_id);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  amount_kobo integer not null,
  currency text not null default 'NGN',
  product_type text not null,
  product_id uuid,
  flutterwave_ref text unique,
  status text not null default 'pending' check (status in ('pending','successful','failed','cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_tx_user on transactions(user_id);
create index if not exists idx_tx_status on transactions(status);

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into settings(key, value) values
  ('registration_fee', '{"enabled": false, "amount_kobo": 0, "currency": "NGN", "description": "One-time registration"}')
on conflict (key) do nothing;

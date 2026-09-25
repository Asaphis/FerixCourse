-- FerixCourse MVP tables, Phase 5 + 3/4 support.
-- Run after 001_core.sql. Safe to re-run (if not exists).

create table if not exists training_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  topic text not null,
  current_level text not null default 'Beginner',
  background text not null default '',
  goals text not null default '',
  preferred_schedule text not null default '',
  preferred_days text not null default '',
  preferred_time text not null default '',
  mode text not null default 'online' check (mode in ('online','physical')),
  audience text not null default 'individual' check (audience in ('individual','group')),
  budget_kobo integer not null default 0,
  message text not null default '',
  status text not null default 'pending' check (status in ('pending','reviewing','accepted','rejected','converted')),
  admin_note text not null default '',
  converted_classroom_id uuid references classrooms(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_requests_user on training_requests(user_id);
create index if not exists idx_requests_status on training_requests(status);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  topic text not null,
  duration_min integer not null default 60,
  mode text not null default 'online' check (mode in ('online','physical')),
  preferred_date date,
  preferred_time text not null default '',
  location text not null default '',
  message text not null default '',
  status text not null default 'pending' check (status in ('pending','confirmed','paid','completed','cancelled')),
  livekit_room text,
  created_at timestamptz not null default now()
);
create index if not exists idx_bookings_user on bookings(user_id);
create index if not exists idx_bookings_status on bookings(status);

create table if not exists classroom_sessions (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references classrooms(id) on delete cascade,
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  livekit_room text not null,
  recording_status text not null default 'none' check (recording_status in ('none','recording','processing','ready','failed')),
  created_at timestamptz not null default now()
);
create index if not exists idx_sessions_room on classroom_sessions(classroom_id);

create table if not exists classroom_recordings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references classroom_sessions(id) on delete cascade,
  storage_key text not null,
  duration_sec integer not null default 0,
  size_bytes bigint not null default 0,
  status text not null default 'processing' check (status in ('processing','ready','failed')),
  created_at timestamptz not null default now()
);

create table if not exists classroom_materials (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references classrooms(id) on delete cascade,
  title text not null,
  storage_key text not null,
  mime text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists course_materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references lessons(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  title text not null,
  storage_key text not null,
  mime text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists lesson_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  subject text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_conv on messages(conversation_id);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user on notifications(user_id);

create table if not exists attendance (
  session_id uuid not null references classroom_sessions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

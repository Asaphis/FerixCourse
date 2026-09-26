-- Isolation + queue + workspace tables. Safe to re-run.

-- Request queue: other users join a training request's waiting list.
create table if not exists request_queue (
  request_id uuid not null references training_requests(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);
create index if not exists idx_queue_request on request_queue(request_id);

-- Message context: every conversation belongs to exactly one scope.
-- NULL classroom_id AND NULL booking_id AND NULL course_id = general support.
alter table conversations add column if not exists classroom_id uuid references classrooms(id) on delete cascade;
alter table conversations add column if not exists booking_id uuid references bookings(id) on delete cascade;
alter table conversations add column if not exists course_id uuid references courses(id) on delete cascade;
create index if not exists idx_conv_classroom on conversations(classroom_id);
create index if not exists idx_conv_booking on conversations(booking_id);

-- Classroom announcements (instructor/admin → members).
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references classrooms(id) on delete cascade,
  author_id uuid not null references profiles(id),
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_ann_classroom on announcements(classroom_id);

-- Assignments + submissions + feedback.
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references classrooms(id) on delete cascade,
  title text not null,
  description text not null default '',
  due_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_assign_classroom on assignments(classroom_id);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null default '',
  file_key text,
  feedback text not null default '',
  created_at timestamptz not null default now(),
  unique(assignment_id, user_id)
);

-- Sessions gain a live status for start/end control.
alter table classroom_sessions add column if not exists status text not null default 'scheduled'
  check (status in ('scheduled','live','ended'));

-- Classroom group discussion (members only, checked in API).
create table if not exists classroom_messages (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references classrooms(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_cm_classroom on classroom_messages(classroom_id);

-- Booking agreed price (set by admin after discussion, paid in Phase 3 flow).
alter table bookings add column if not exists price_kobo integer not null default 0;

-- Response-time SLA (hours) for request estimates.
insert into settings(key, value) values ('request_sla', '{"hours": 48}')
on conflict (key) do nothing;

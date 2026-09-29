-- Realign schema with the rebuilt learner + admin frontends (2026 rebuild).

-- Profile: phone + preferences for the profile page.
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists preferences jsonb not null default '{}';

-- Learner/admin messages: threaded replies + attachments.
alter table messages add column if not exists parent_id uuid references messages(id) on delete set null;
alter table messages add column if not exists attachment_key text;
alter table messages add column if not exists attachment_name text;
alter table messages add column if not exists attachment_kind text;

-- Classroom discussion: replies, issue/solved workflow, attachments.
alter table classroom_messages add column if not exists parent_id uuid references classroom_messages(id) on delete cascade;
alter table classroom_messages add column if not exists is_issue boolean not null default false;
alter table classroom_messages add column if not exists is_solved boolean not null default false;
alter table classroom_messages add column if not exists attachment_key text;
alter table classroom_messages add column if not exists attachment_name text;
alter table classroom_messages add column if not exists attachment_kind text;

-- Per-member read marker for the classroom Discuss tab (seen counts, honest unread).
create table if not exists classroom_reads (
  classroom_id uuid not null references classrooms(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (classroom_id, user_id)
);

-- Admin broadcast history.
create table if not exists broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  audience text not null default 'all' check (audience in ('all','students','instructors','active')),
  sent_by uuid references profiles(id),
  recipient_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- LiveKit egress tracking for the recording pipeline.
alter table classroom_sessions add column if not exists egress_id text;

create index if not exists idx_messages_conv_created on messages(conversation_id, created_at);
create index if not exists idx_notifications_user_read on notifications(user_id, is_read);
create index if not exists idx_classroom_messages_created on classroom_messages(classroom_id, created_at);

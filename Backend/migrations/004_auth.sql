-- Backend-owned auth (no Supabase Auth). Safe to re-run.

alter table profiles alter column id set default gen_random_uuid();
alter table profiles add column if not exists password_hash text not null default '';
alter table profiles add column if not exists email_verified boolean not null default false;
alter table profiles add column if not exists verify_token text;
alter table profiles add column if not exists reset_token text;
alter table profiles add column if not exists reset_expires timestamptz;

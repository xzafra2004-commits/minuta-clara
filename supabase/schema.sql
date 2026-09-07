create extension if not exists pgcrypto;

create table if not exists public.meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 120),
  original_notes text not null check (char_length(original_notes) between 40 and 12000),
  summary text not null,
  decisions jsonb not null default '[]'::jsonb,
  tasks jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb
);

alter table public.meeting_minutes enable row level security;

-- No se crean políticas públicas. Las funciones serverless acceden con la
-- service role y el navegador nunca recibe esa clave.

create index if not exists meeting_minutes_created_at_idx
  on public.meeting_minutes (created_at desc);

-- 백필 마이그레이션: 대시보드에서 직접 생성했던 테이블들을 저장소에 기록.
-- 컬럼 정의는 라이브 DB의 PostgREST 스키마에서 추출 (2026-07-04).
-- 라이브 DB에는 이미 존재하므로 no-op이며, 새 환경 재현용.
-- FK의 on delete 동작은 라이브 DB에서 확인 불가하여 합리적 기본값으로 작성.

-- clients ---------------------------------------------------------------

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  contact text,
  phone text,
  memo text,
  created_at timestamptz default now()
);

alter table public.clients enable row level security;

drop policy if exists "clients_all_own" on public.clients;
create policy "clients_all_own"
  on public.clients for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- projects --------------------------------------------------------------

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  status text not null default 'proposal',
  category text not null default 'personal',
  start_date date,
  end_date date,
  estimated_amount integer,
  memo text,
  github_repo text,
  url text,
  created_at timestamptz default now()
);

alter table public.projects enable row level security;

drop policy if exists "projects_all_own" on public.projects;
create policy "projects_all_own"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- project_logs ----------------------------------------------------------

create table if not exists public.project_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  log_date date not null,
  content text not null,
  created_at timestamptz default now()
);

alter table public.project_logs enable row level security;

drop policy if exists "project_logs_all_own" on public.project_logs;
create policy "project_logs_all_own"
  on public.project_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- resources -------------------------------------------------------------

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text not null,
  category text not null default 'etc',
  memo text,
  created_at timestamptz not null default now()
);

alter table public.resources enable row level security;

drop policy if exists "resources_all_own" on public.resources;
create policy "resources_all_own"
  on public.resources for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- quotes ----------------------------------------------------------------

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  recipient_name text not null default '',
  quote_date date not null default current_date,
  quote_number text not null default '',
  validity_days integer not null default 14,
  production_period text not null default '',
  notes text,
  status text not null default 'draft',
  created_at timestamptz default now()
);

alter table public.quotes enable row level security;

drop policy if exists "quotes_all_own" on public.quotes;
create policy "quotes_all_own"
  on public.quotes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- quote_items (user_id 없음 — 소유권은 quotes를 통해 확인) ---------------

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  sort_order integer not null default 0,
  name text not null,
  description text,
  unit_price integer,
  quantity integer,
  amount integer,
  price_label text,
  is_section boolean not null default false
);

alter table public.quote_items enable row level security;

drop policy if exists "quote_items_all_own" on public.quote_items;
create policy "quote_items_all_own"
  on public.quote_items for all
  using (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_items.quote_id and quotes.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_items.quote_id and quotes.user_id = auth.uid()
    )
  );

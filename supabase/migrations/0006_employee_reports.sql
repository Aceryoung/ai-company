-- 직원 보고서 저장 테이블
create table if not exists public.employee_reports (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null,
  employee_name text not null,
  dept text not null,
  title text not null,
  content text not null,           -- Markdown 보고서 본문
  requested_message text,          -- 대표가 요청한 원본 메시지
  created_at timestamptz not null default now()
);

-- RLS 정책
alter table public.employee_reports enable row level security;

create policy "Authenticated users can read reports"
  on public.employee_reports for select
  to authenticated
  using (true);

create policy "Authenticated users can insert reports"
  on public.employee_reports for insert
  to authenticated
  with check (true);

-- 서비스 롤도 허용 (API 라우트에서 사용)
create policy "Service role full access"
  on public.employee_reports for all
  to service_role
  using (true)
  with check (true);

alter table public.businesses
  add column if not exists pipeline_stage text not null default 'discovered'
    check (pipeline_stage in ('discovered', 'qualified', 'audit_ready', 'demo_ready', 'outreach_draft', 'contacted', 'replied', 'meeting', 'proposal', 'won', 'lost')),
  add column if not exists pipeline_status text not null default 'active'
    check (pipeline_status in ('active', 'paused', 'closed')),
  add column if not exists stage_updated_at timestamptz not null default now();

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  name text not null,
  stage text not null default 'discovery'
    check (stage in ('discovery', 'audit', 'demo', 'sales', 'onboarding', 'build', 'client_review', 'launch', 'maintenance')),
  status text not null default 'planned'
    check (status in ('planned', 'active', 'blocked', 'completed', 'cancelled')),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  next_action text,
  blocker text,
  target_launch_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  agent_type text not null
    check (agent_type in ('orchestrator', 'scout', 'audit', 'demo_generator', 'outreach_drafter', 'project_tracker')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'needs_review', 'succeeded', 'failed', 'cancelled')),
  business_id uuid references public.businesses(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  input_payload jsonb not null default '{}',
  output_payload jsonb,
  idempotency_key text not null unique,
  priority integer not null default 50 check (priority between 0 and 100),
  attempt integer not null default 0 check (attempt >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  error_message text,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists businesses_pipeline_idx on public.businesses (pipeline_status, pipeline_stage, stage_updated_at desc);
create index if not exists projects_status_idx on public.projects (status, stage, updated_at desc);
create index if not exists projects_business_idx on public.projects (business_id);
create index if not exists agent_jobs_queue_idx on public.agent_jobs (status, priority desc, requested_at);
create index if not exists agent_jobs_business_idx on public.agent_jobs (business_id, requested_at desc) where business_id is not null;
create index if not exists agent_jobs_project_idx on public.agent_jobs (project_id, requested_at desc) where project_id is not null;

alter table public.projects enable row level security;
alter table public.agent_jobs enable row level security;

revoke all on public.projects, public.agent_jobs from anon, authenticated;

create or replace view public.lead_dashboard
with (security_invoker = true)
as
select
  b.id,
  b.google_place_id,
  b.name,
  b.address,
  b.latitude,
  b.longitude,
  b.state,
  b.city,
  b.territory_id,
  b.category_id,
  b.rating,
  b.review_count,
  b.website_url,
  b.phone,
  b.google_maps_url,
  b.business_status,
  b.last_seen_at,
  a.status as website_status,
  a.http_status,
  a.mobile_friendly,
  a.has_clear_cta,
  a.checked_at as website_checked_at,
  s.business_quality,
  s.digital_weakness,
  s.revenue_potential,
  s.opportunity_score,
  s.tier,
  coalesce(c.email_count, 0)::integer as email_count,
  coalesce(c.email_count, 0) > 0 as has_email,
  c.primary_email,
  c.email_source_url,
  b.pipeline_stage,
  b.pipeline_status,
  b.stage_updated_at
from public.businesses b
left join lateral (
  select wa.* from public.website_audits wa
  where wa.business_id = b.id order by wa.checked_at desc limit 1
) a on true
left join public.business_scores s on s.business_id = b.id
left join lateral (
  select
    count(*) filter (where cs.email is not null) as email_count,
    (array_agg(cs.email order by cs.discovered_at desc) filter (where cs.email is not null))[1] as primary_email,
    (array_agg(cs.source_url order by cs.discovered_at desc) filter (where cs.email is not null))[1] as email_source_url
  from public.contact_sources cs
  where cs.business_id = b.id and cs.status = 'found'
) c on true;

create or replace view public.project_board
with (security_invoker = true)
as
select
  p.id,
  p.business_id,
  p.name,
  p.stage,
  p.status,
  p.progress_percent,
  p.next_action,
  p.blocker,
  p.target_launch_at,
  p.updated_at,
  b.name as business_name,
  b.city,
  b.state
from public.projects p
join public.businesses b on b.id = p.business_id;

revoke all on public.project_board from anon, authenticated;

create extension if not exists pgcrypto;

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'google_places',
  territory_id text not null,
  category_id text not null,
  status text not null default 'running' check (status in ('running', 'completed', 'partial', 'failed')),
  cells_scanned integer not null default 0 check (cells_scanned >= 0),
  places_fetched integer not null default 0 check (places_fetched >= 0),
  businesses_upserted integer not null default 0 check (businesses_upserted >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  google_place_id text not null unique,
  name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  state text not null check (state in ('NY', 'NJ')),
  city text not null,
  territory_id text not null,
  category_id text not null,
  rating numeric(2,1) check (rating is null or rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  website_url text,
  phone text,
  google_maps_url text,
  business_status text,
  google_types text[] not null default '{}',
  provider_payload jsonb not null default '{}',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.website_audits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  checked_url text,
  final_url text,
  status text not null check (status in ('missing', 'unreachable', 'weak', 'reachable', 'unknown')),
  http_status integer,
  latency_ms integer,
  mobile_friendly boolean,
  has_clear_cta boolean,
  error_message text,
  checked_at timestamptz not null default now()
);

create table if not exists public.contact_sources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text,
  source_url text not null,
  extraction_method text not null check (extraction_method in ('mailto', 'page_text', 'scan_status')),
  confidence text check (confidence is null or confidence in ('high', 'medium')),
  status text not null check (status in ('found', 'not_found', 'skipped', 'error')),
  error_message text,
  discovered_at timestamptz not null default now(),
  unique (business_id, email, source_url)
);

create table if not exists public.business_scores (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  business_quality integer not null check (business_quality between 0 and 100),
  digital_weakness integer not null check (digital_weakness between 0 and 100),
  revenue_potential integer not null check (revenue_potential between 0 and 100),
  opportunity_score integer not null check (opportunity_score between 0 and 100),
  tier text not null check (tier in ('S', 'A', 'B', 'C')),
  scoring_version text not null default 'phase1-v1',
  scored_at timestamptz not null default now()
);

create index if not exists businesses_location_idx on public.businesses (state, city, territory_id);
create index if not exists businesses_category_idx on public.businesses (category_id);
create index if not exists businesses_quality_signals_idx on public.businesses (rating desc, review_count desc);
create index if not exists website_audits_latest_idx on public.website_audits (business_id, checked_at desc);
create index if not exists contact_sources_business_idx on public.contact_sources (business_id) where email is not null;
create index if not exists business_scores_opportunity_idx on public.business_scores (tier, opportunity_score desc);

alter table public.ingestion_runs enable row level security;
alter table public.businesses enable row level security;
alter table public.website_audits enable row level security;
alter table public.contact_sources enable row level security;
alter table public.business_scores enable row level security;

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
  c.email_source_url
from public.businesses b
left join lateral (
  select wa.*
  from public.website_audits wa
  where wa.business_id = b.id
  order by wa.checked_at desc
  limit 1
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

revoke all on public.ingestion_runs, public.businesses, public.website_audits, public.contact_sources, public.business_scores from anon, authenticated;
revoke all on public.lead_dashboard from anon, authenticated;

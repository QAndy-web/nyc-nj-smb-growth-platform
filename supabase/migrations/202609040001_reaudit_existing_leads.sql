create or replace function public.is_qualified_public_email(candidate text)
returns boolean
language sql
immutable
returns null on null input
as $$
  select
    candidate ~* '^[a-z0-9.!#$%&''*+=?^_`{|}~-]+@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]([a-z0-9-]{0,61}[a-z0-9])?)+$'
    and lower(candidate) !~ '^(noreply|no-reply)@'
    and lower(candidate) !~ '\.(png|jpg|jpeg|gif|svg|webp)$';
$$;

alter table public.contact_sources
  add column if not exists quality_status text not null default 'pending'
    check (quality_status in ('pending', 'accepted', 'rejected', 'superseded')),
  add column if not exists quality_reason text,
  add column if not exists quality_reviewed_at timestamptz;

-- Preserve every historical row. Invalid parser output is quarantined and can be
-- restored by changing quality_status; no contact data is deleted by this migration.
update public.contact_sources
set
  quality_status = case when public.is_qualified_public_email(email) then 'accepted' else 'rejected' end,
  quality_reason = case when public.is_qualified_public_email(email) then 'historical_regex_review' else 'parser_validation_failed' end,
  quality_reviewed_at = now()
where status = 'found';

alter table public.businesses
  add column if not exists lead_quality_status text not null default 'verified'
    check (lead_quality_status in ('verified', 'needs_reaudit')),
  add column if not exists quality_reason text,
  add column if not exists quality_checked_at timestamptz;

-- Existing derived facts were produced by the pre-v2 fetch/parser path. Mark them
-- stale instead of deleting them; the bounded re-audit command verifies each lead.
update public.businesses b
set
  lead_quality_status = 'needs_reaudit',
  quality_reason = 'audit_v2_required',
  quality_checked_at = null
where exists (select 1 from public.website_audits wa where wa.business_id = b.id)
   or exists (select 1 from public.contact_sources cs where cs.business_id = b.id)
   or exists (select 1 from public.business_scores bs where bs.business_id = b.id);

create index if not exists contact_sources_accepted_business_idx
  on public.contact_sources (business_id, discovered_at desc)
  where status = 'found' and quality_status = 'accepted';

create index if not exists businesses_lead_quality_idx
  on public.businesses (lead_quality_status, updated_at);

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
  case when b.lead_quality_status = 'verified' then a.status else 'unknown' end as website_status,
  case when b.lead_quality_status = 'verified' then a.http_status end as http_status,
  case when b.lead_quality_status = 'verified' then a.mobile_friendly end as mobile_friendly,
  case when b.lead_quality_status = 'verified' then a.has_clear_cta end as has_clear_cta,
  a.checked_at as website_checked_at,
  case when b.lead_quality_status = 'verified' then s.business_quality end as business_quality,
  case when b.lead_quality_status = 'verified' then s.digital_weakness end as digital_weakness,
  case when b.lead_quality_status = 'verified' then s.revenue_potential end as revenue_potential,
  case when b.lead_quality_status = 'verified' then s.opportunity_score end as opportunity_score,
  case when b.lead_quality_status = 'verified' then s.tier end as tier,
  coalesce(c.email_count, 0)::integer as email_count,
  coalesce(c.email_count, 0) > 0 as has_email,
  c.primary_email,
  c.email_source_url,
  b.pipeline_stage,
  b.pipeline_status,
  b.stage_updated_at,
  b.lead_quality_status,
  b.quality_reason,
  b.quality_checked_at
from public.businesses b
left join lateral (
  select wa.* from public.website_audits wa
  where wa.business_id = b.id order by wa.checked_at desc limit 1
) a on true
left join public.business_scores s on s.business_id = b.id
left join lateral (
  select
    count(distinct cs.email) as email_count,
    (array_agg(cs.email order by case cs.confidence when 'high' then 0 else 1 end, cs.discovered_at desc))[1] as primary_email,
    (array_agg(cs.source_url order by case cs.confidence when 'high' then 0 else 1 end, cs.discovered_at desc))[1] as email_source_url
  from public.contact_sources cs
  where
    cs.business_id = b.id
    and b.lead_quality_status = 'verified'
    and cs.status = 'found'
    and cs.quality_status = 'accepted'
    and public.is_qualified_public_email(cs.email)
) c on true;

revoke all on public.lead_dashboard from anon, authenticated;

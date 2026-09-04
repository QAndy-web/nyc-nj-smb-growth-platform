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
    count(distinct cs.email) as email_count,
    (array_agg(cs.email order by case cs.confidence when 'high' then 0 else 1 end, cs.discovered_at desc))[1] as primary_email,
    (array_agg(cs.source_url order by case cs.confidence when 'high' then 0 else 1 end, cs.discovered_at desc))[1] as email_source_url
  from public.contact_sources cs
  where
    cs.business_id = b.id
    and cs.status = 'found'
    and cs.email ~* '^[a-z0-9.!#$%&''*+=?^_`{|}~-]+@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z][a-z0-9-]{0,61}[a-z0-9])+$'
) c on true;

revoke all on public.lead_dashboard from anon, authenticated;

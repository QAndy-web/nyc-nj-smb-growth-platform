-- Additive ontology/context layer. Existing Lead Engine tables and columns remain
-- the compatibility storage and can be read while consumers migrate gradually.

alter table public.businesses
  add column if not exists company_state text not null default 'discovered'
    check (company_state in ('discovered', 'identity_pending', 'verified', 'rejected', 'archived')),
  add column if not exists canonical_fact_version integer not null default 1 check (canonical_fact_version > 0),
  add column if not exists state_updated_at timestamptz not null default now(),
  add column if not exists last_evidence_ids uuid[] not null default '{}',
  add column if not exists last_actor_type text not null default 'system'
    check (last_actor_type in ('human', 'agent', 'system', 'migration')),
  add column if not exists last_actor_id text;

update public.businesses
set
  company_state = case when lead_quality_status = 'verified' then 'verified' else 'identity_pending' end,
  state_updated_at = coalesce(quality_checked_at, updated_at, now()),
  last_actor_type = 'migration',
  last_actor_id = '202609040002_ontology_state_layer';

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null
    check (subject_type in ('company', 'website', 'contact', 'website_audit', 'opportunity')),
  subject_id uuid,
  source_type text not null,
  source_record_id text not null,
  source_url text,
  observed_value jsonb not null,
  fingerprint text not null,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  observed_at timestamptz not null,
  recorded_by_type text not null default 'system'
    check (recorded_by_type in ('human', 'agent', 'system', 'migration')),
  recorded_by_id text,
  created_at timestamptz not null default now(),
  unique (source_type, source_record_id, fingerprint)
);

create table if not exists public.facts (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null
    check (subject_type in ('company', 'website', 'contact', 'website_audit', 'opportunity')),
  subject_id uuid not null,
  field_name text not null,
  value jsonb not null,
  status text not null default 'candidate'
    check (status in ('candidate', 'accepted', 'rejected', 'superseded')),
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  observation_id uuid not null references public.observations(id) on delete restrict,
  resolver text not null,
  created_by_type text not null default 'system'
    check (created_by_type in ('human', 'agent', 'system', 'migration')),
  created_by_id text,
  valid_from timestamptz not null default now(),
  superseded_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists facts_one_accepted_value_idx
  on public.facts (subject_type, subject_id, field_name)
  where status = 'accepted';
create index if not exists facts_subject_history_idx
  on public.facts (subject_type, subject_id, field_name, created_at desc);
create index if not exists observations_subject_idx
  on public.observations (subject_type, subject_id, observed_at desc);

create table if not exists public.websites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.businesses(id) on delete cascade,
  observed_url text not null,
  canonical_url text,
  verification_status text not null default 'candidate'
    check (verification_status in ('candidate', 'verified', 'rejected', 'unknown')),
  source_observation_id uuid references public.observations(id) on delete restrict,
  last_evidence_ids uuid[] not null default '{}',
  last_actor_type text not null default 'system'
    check (last_actor_type in ('human', 'agent', 'system', 'migration')),
  last_actor_id text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, observed_url)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.businesses(id) on delete cascade,
  contact_type text not null check (contact_type in ('email', 'phone', 'form', 'social')),
  value text not null,
  verification_status text not null default 'candidate'
    check (verification_status in ('candidate', 'verified', 'rejected', 'superseded')),
  public_source_only boolean not null default true check (public_source_only),
  source_url text,
  source_observation_id uuid references public.observations(id) on delete restrict,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  last_evidence_ids uuid[] not null default '{}',
  last_actor_type text not null default 'system'
    check (last_actor_type in ('human', 'agent', 'system', 'migration')),
  last_actor_id text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, contact_type, value, source_url)
);

alter table public.website_audits
  add column if not exists website_id uuid references public.websites(id) on delete set null,
  add column if not exists audit_state text not null default 'completed'
    check (audit_state in ('requested', 'running', 'completed', 'inconclusive', 'failed')),
  add column if not exists evidence_observation_id uuid references public.observations(id) on delete restrict,
  add column if not exists actor_type text not null default 'system'
    check (actor_type in ('human', 'agent', 'system', 'migration')),
  add column if not exists actor_id text;

create table if not exists public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  website_audit_id uuid not null references public.website_audits(id) on delete cascade,
  finding_key text not null,
  category text not null check (category in ('availability', 'mobile', 'conversion', 'contact', 'seo', 'other')),
  severity text not null check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  finding text not null,
  observed_value jsonb,
  evidence_observation_id uuid not null references public.observations(id) on delete restrict,
  source_url text,
  created_at timestamptz not null default now(),
  unique (website_audit_id, finding_key)
);

alter table public.business_scores
  add column if not exists fit_score integer check (fit_score is null or fit_score between 0 and 100),
  add column if not exists need_score integer check (need_score is null or need_score between 0 and 100),
  add column if not exists reachability_score integer check (reachability_score is null or reachability_score between 0 and 100),
  add column if not exists value_score integer check (value_score is null or value_score between 0 and 100),
  add column if not exists confidence_score integer check (confidence_score is null or confidence_score between 0 and 100),
  add column if not exists score_explanation jsonb not null default '{}';

update public.business_scores s
set
  fit_score = coalesce(s.fit_score, s.business_quality),
  need_score = coalesce(s.need_score, s.digital_weakness),
  value_score = coalesce(s.value_score, s.revenue_potential),
  reachability_score = coalesce(s.reachability_score, case
    when exists (
      select 1 from public.contact_sources cs
      where cs.business_id = s.business_id
        and cs.status = 'found'
        and cs.quality_status = 'accepted'
        and public.is_qualified_public_email(cs.email)
    ) then 100
    when exists (select 1 from public.businesses b where b.id = s.business_id and b.phone is not null) then 65
    else 25
  end),
  confidence_score = coalesce(s.confidence_score, case
    when exists (select 1 from public.businesses b where b.id = s.business_id and b.lead_quality_status = 'verified') then 85
    else 40
  end),
  score_explanation = case when s.score_explanation = '{}'::jsonb then jsonb_build_object(
    'compatibility', 'backfilled from existing Phase 1 score',
    'legacyOpportunityScorePreserved', true
  ) else s.score_explanation end;

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.businesses(id) on delete cascade,
  is_current boolean not null default true,
  qualification_state text not null default 'unassessed'
    check (qualification_state in ('unassessed', 'screening', 'qualified', 'disqualified')),
  sales_stage text not null default 'not_started'
    check (sales_stage in ('not_started', 'outreach_ready', 'contacted', 'replied', 'meeting', 'proposal', 'won', 'lost')),
  legacy_opportunity_score integer check (legacy_opportunity_score is null or legacy_opportunity_score between 0 and 100),
  fit_score integer check (fit_score is null or fit_score between 0 and 100),
  need_score integer check (need_score is null or need_score between 0 and 100),
  reachability_score integer check (reachability_score is null or reachability_score between 0 and 100),
  value_score integer check (value_score is null or value_score between 0 and 100),
  confidence_score integer check (confidence_score is null or confidence_score between 0 and 100),
  scoring_version text,
  disqualification_reason text,
  qualified_at timestamptz,
  last_evidence_ids uuid[] not null default '{}',
  last_actor_type text not null default 'system'
    check (last_actor_type in ('human', 'agent', 'system', 'migration')),
  last_actor_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists opportunities_one_current_company_idx
  on public.opportunities (company_id) where is_current;
create index if not exists opportunities_pipeline_idx
  on public.opportunities (qualification_state, sales_stage, updated_at desc) where is_current;

insert into public.opportunities (
  company_id, qualification_state, sales_stage, legacy_opportunity_score,
  fit_score, need_score, reachability_score, value_score, confidence_score,
  scoring_version, qualified_at, last_actor_type, last_actor_id, created_at, updated_at
)
select
  b.id,
  case when b.pipeline_stage = 'discovered' then 'unassessed' else 'qualified' end,
  case b.pipeline_stage
    when 'outreach_draft' then 'outreach_ready'
    when 'contacted' then 'contacted'
    when 'replied' then 'replied'
    when 'meeting' then 'meeting'
    when 'proposal' then 'proposal'
    when 'won' then 'won'
    when 'lost' then 'lost'
    else 'not_started'
  end,
  s.opportunity_score,
  s.fit_score,
  s.need_score,
  s.reachability_score,
  s.value_score,
  s.confidence_score,
  s.scoring_version,
  case when b.pipeline_stage <> 'discovered' then b.stage_updated_at end,
  'migration',
  '202609040002_ontology_state_layer',
  coalesce(s.scored_at, b.created_at),
  greatest(coalesce(s.scored_at, b.updated_at), b.stage_updated_at)
from public.businesses b
join public.business_scores s on s.business_id = b.id
on conflict (company_id) where is_current do nothing;

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('opportunity', 'demo', 'outreach', 'project')),
  subject_id uuid not null,
  action_name text not null check (action_name in ('share_demo', 'send_outreach', 'launch_project')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  request_context jsonb not null default '{}',
  evidence_ids uuid[] not null default '{}',
  requested_by_type text not null check (requested_by_type in ('human', 'agent', 'system')),
  requested_by_id text,
  resolved_by text,
  decision_note text,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists approvals_one_pending_action_idx
  on public.approvals (subject_type, subject_id, action_name) where status = 'pending';
create index if not exists approvals_queue_idx
  on public.approvals (status, requested_at) where status = 'pending';

create table if not exists public.domain_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'observation.recorded', 'company.verified', 'website.verified', 'audit.completed',
    'opportunity.qualified', 'contact.verified', 'approval.requested', 'approval.resolved'
  )),
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null default '{}',
  evidence_ids uuid[] not null default '{}',
  actor_type text not null check (actor_type in ('human', 'agent', 'system', 'migration')),
  actor_id text,
  idempotency_key text not null unique,
  occurred_at timestamptz not null default now()
);

create index if not exists domain_events_aggregate_idx
  on public.domain_events (aggregate_type, aggregate_id, occurred_at desc);
create index if not exists domain_events_dispatch_idx
  on public.domain_events (event_type, occurred_at);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  object_type text not null,
  object_id uuid not null,
  action_name text not null,
  before_state jsonb,
  after_state jsonb,
  evidence_ids uuid[] not null default '{}',
  actor_type text not null check (actor_type in ('human', 'agent', 'system', 'migration')),
  actor_id text,
  domain_event_id uuid references public.domain_events(id) on delete set null,
  reversible boolean not null default true,
  rollback_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_object_idx
  on public.audit_logs (object_type, object_id, created_at desc);

alter table public.projects
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete set null,
  add column if not exists last_evidence_ids uuid[] not null default '{}',
  add column if not exists last_actor_type text not null default 'system'
    check (last_actor_type in ('human', 'agent', 'system', 'migration')),
  add column if not exists last_actor_id text;

update public.projects p
set
  opportunity_id = o.id,
  last_actor_type = 'migration',
  last_actor_id = '202609040002_ontology_state_layer'
from public.opportunities o
where o.company_id = p.business_id and o.is_current and p.opportunity_id is null;

alter table public.agent_jobs
  add column if not exists action_name text,
  add column if not exists action_context jsonb not null default '{}',
  add column if not exists evidence_ids uuid[] not null default '{}',
  add column if not exists approval_id uuid references public.approvals(id) on delete restrict;

update public.agent_jobs
set action_name = case agent_type
  when 'orchestrator' then 'plan_next_action'
  when 'scout' then 'record_observation'
  when 'audit' then 'run_website_audit'
  when 'demo_generator' then 'generate_demo'
  when 'outreach_drafter' then 'draft_outreach'
  when 'project_tracker' then 'update_project'
end
where action_name is null;

alter table public.agent_jobs
  alter column action_name set not null,
  add constraint agent_jobs_action_name_check check (action_name in (
    'plan_next_action', 'record_observation', 'run_website_audit', 'generate_demo',
    'draft_outreach', 'update_project', 'verify_company', 'verify_website',
    'complete_audit', 'verify_contact', 'qualify_opportunity', 'share_demo',
    'send_outreach', 'launch_project', 'advance_sales_stage', 'request_approval'
  ));

-- Backfill raw provider, audit and public-contact evidence without deleting or
-- rewriting any legacy rows.
insert into public.observations (
  subject_type, subject_id, source_type, source_record_id, source_url,
  observed_value, fingerprint, confidence, observed_at, recorded_by_type, recorded_by_id
)
select
  'company', b.id, 'google_places', b.google_place_id, b.google_maps_url,
  coalesce(b.provider_payload, '{}'::jsonb),
  encode(digest(coalesce(b.provider_payload, '{}'::jsonb)::text, 'sha256'), 'hex'),
  0.900, b.last_seen_at, 'migration', '202609040002_ontology_state_layer'
from public.businesses b
on conflict (source_type, source_record_id, fingerprint) do update
set subject_id = excluded.subject_id;

insert into public.observations (
  subject_type, subject_id, source_type, source_record_id, source_url,
  observed_value, fingerprint, confidence, observed_at, recorded_by_type, recorded_by_id
)
select
  'website_audit', wa.id, 'website_audit', wa.id::text, coalesce(wa.final_url, wa.checked_url),
  jsonb_build_object(
    'status', wa.status, 'httpStatus', wa.http_status, 'latencyMs', wa.latency_ms,
    'mobileFriendly', wa.mobile_friendly, 'hasClearCta', wa.has_clear_cta,
    'error', wa.error_message
  ),
  encode(digest(jsonb_build_object(
    'status', wa.status, 'httpStatus', wa.http_status, 'latencyMs', wa.latency_ms,
    'mobileFriendly', wa.mobile_friendly, 'hasClearCta', wa.has_clear_cta,
    'error', wa.error_message
  )::text, 'sha256'), 'hex'),
  case when wa.status = 'unknown' then 0.400 else 0.850 end,
  wa.checked_at, 'migration', '202609040002_ontology_state_layer'
from public.website_audits wa
on conflict (source_type, source_record_id, fingerprint) do update
set subject_id = excluded.subject_id;

insert into public.observations (
  subject_type, subject_id, source_type, source_record_id, source_url,
  observed_value, fingerprint, confidence, observed_at, recorded_by_type, recorded_by_id
)
select
  'contact', cs.id, 'public_contact_scan', cs.id::text, cs.source_url,
  jsonb_build_object(
    'email', cs.email, 'status', cs.status, 'extractionMethod', cs.extraction_method,
    'qualityStatus', cs.quality_status, 'qualityReason', cs.quality_reason
  ),
  encode(digest(jsonb_build_object(
    'email', cs.email, 'status', cs.status, 'extractionMethod', cs.extraction_method,
    'qualityStatus', cs.quality_status, 'qualityReason', cs.quality_reason
  )::text, 'sha256'), 'hex'),
  case cs.confidence when 'high' then 0.950 when 'medium' then 0.750 else 0.500 end,
  cs.discovered_at, 'migration', '202609040002_ontology_state_layer'
from public.contact_sources cs
on conflict (source_type, source_record_id, fingerprint) do update
set subject_id = excluded.subject_id;

insert into public.facts (
  subject_type, subject_id, field_name, value, status, confidence,
  observation_id, resolver, created_by_type, created_by_id, valid_from
)
select
  'company', b.id, values_to_promote.field_name, values_to_promote.value,
  values_to_promote.status, 0.900, o.id, 'google_place_id_v1',
  'migration', '202609040002_ontology_state_layer', b.last_seen_at
from public.businesses b
join public.observations o
  on o.source_type = 'google_places' and o.source_record_id = b.google_place_id
cross join lateral (values
  ('name', to_jsonb(b.name), 'accepted'),
  ('address', to_jsonb(b.address), 'accepted'),
  ('phone', to_jsonb(b.phone), 'accepted'),
  ('website_url', to_jsonb(b.website_url), 'candidate')
) as values_to_promote(field_name, value, status)
where values_to_promote.value <> 'null'::jsonb
  and not exists (
    select 1 from public.facts f
    where f.subject_type = 'company'
      and f.subject_id = b.id
      and f.field_name = values_to_promote.field_name
      and f.status = values_to_promote.status
  );

insert into public.websites (
  company_id, observed_url, canonical_url, verification_status,
  source_observation_id, last_actor_type, last_actor_id, verified_at
)
select
  b.id, b.website_url,
  case when wa.status in ('reachable', 'weak') then coalesce(wa.final_url, b.website_url) end,
  case
    when wa.status in ('reachable', 'weak') then 'verified'
    when wa.status = 'unreachable' then 'rejected'
    when wa.status = 'unknown' then 'unknown'
    else 'candidate'
  end,
  o.id, 'migration', '202609040002_ontology_state_layer',
  case when wa.status in ('reachable', 'weak') then wa.checked_at end
from public.businesses b
join public.observations o
  on o.source_type = 'google_places' and o.source_record_id = b.google_place_id
left join lateral (
  select latest.* from public.website_audits latest
  where latest.business_id = b.id order by latest.checked_at desc limit 1
) wa on true
where b.website_url is not null
on conflict (company_id, observed_url) do nothing;

update public.website_audits wa
set
  website_id = (
    select w.id from public.websites w
    where w.company_id = wa.business_id
      and w.observed_url in (wa.checked_url, wa.final_url)
    order by w.updated_at desc
    limit 1
  ),
  evidence_observation_id = o.id,
  audit_state = case when wa.status = 'unknown' then 'inconclusive' else 'completed' end,
  actor_type = 'migration',
  actor_id = '202609040002_ontology_state_layer'
from public.observations o
where o.source_type = 'website_audit'
  and o.source_record_id = wa.id::text
  and wa.evidence_observation_id is null;

insert into public.contacts (
  company_id, contact_type, value, verification_status, public_source_only,
  source_url, source_observation_id, confidence, last_actor_type, last_actor_id, verified_at
)
select
  cs.business_id, 'email', lower(cs.email),
  case cs.quality_status when 'accepted' then 'verified' when 'rejected' then 'rejected' else 'superseded' end,
  true, cs.source_url, o.id,
  case cs.confidence when 'high' then 0.950 when 'medium' then 0.750 else 0.500 end,
  'migration', '202609040002_ontology_state_layer',
  case when cs.quality_status = 'accepted' then coalesce(cs.quality_reviewed_at, cs.discovered_at) end
from public.contact_sources cs
join public.observations o
  on o.source_type = 'public_contact_scan' and o.source_record_id = cs.id::text
where cs.email is not null
on conflict (company_id, contact_type, value, source_url) do nothing;

create or replace function public.promote_fact(
  p_subject_type text,
  p_subject_id uuid,
  p_field_name text,
  p_value jsonb,
  p_status text,
  p_confidence numeric,
  p_observation_id uuid,
  p_resolver text,
  p_actor_type text,
  p_actor_id text default null
)
returns uuid
language plpgsql
as $$
declare
  promoted_id uuid;
begin
  if p_status not in ('candidate', 'accepted', 'rejected') then
    raise exception 'Unsupported fact status: %', p_status;
  end if;
  if not exists (select 1 from public.observations where id = p_observation_id) then
    raise exception 'Observation % does not exist', p_observation_id;
  end if;
  select id into promoted_id
  from public.facts
  where subject_type = p_subject_type
    and subject_id = p_subject_id
    and field_name = p_field_name
    and value = p_value
    and status = p_status
    and observation_id = p_observation_id
  limit 1;
  if promoted_id is not null then
    return promoted_id;
  end if;
  if p_status = 'accepted' then
    update public.facts
    set status = 'superseded', superseded_at = now()
    where subject_type = p_subject_type
      and subject_id = p_subject_id
      and field_name = p_field_name
      and status = 'accepted';
  end if;
  insert into public.facts (
    subject_type, subject_id, field_name, value, status, confidence,
    observation_id, resolver, created_by_type, created_by_id
  ) values (
    p_subject_type, p_subject_id, p_field_name, p_value, p_status, p_confidence,
    p_observation_id, p_resolver, p_actor_type, p_actor_id
  ) returning id into promoted_id;
  return promoted_id;
end;
$$;

create or replace function public.audit_ontology_state_change()
returns trigger
language plpgsql
as $$
declare
  evidence uuid[];
  new_state jsonb := to_jsonb(new);
  old_state jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  actor_kind text := coalesce(
    to_jsonb(new)->>'last_actor_type',
    to_jsonb(new)->>'actor_type',
    to_jsonb(new)->>'requested_by_type',
    'system'
  );
  actor_identifier text := coalesce(
    to_jsonb(new)->>'last_actor_id',
    to_jsonb(new)->>'actor_id',
    to_jsonb(new)->>'requested_by_id',
    to_jsonb(new)->>'resolved_by'
  );
begin
  if tg_table_name = 'approvals' and tg_op = 'UPDATE'
    and old_state->>'status' is distinct from new_state->>'status'
    and new_state->>'resolved_by' is not null then
    actor_kind := 'human';
    actor_identifier := new_state->>'resolved_by';
  end if;

  select coalesce(array_agg(evidence_item.value::uuid), '{}'::uuid[])
  into evidence
  from jsonb_array_elements_text(
    coalesce(
      new_state->'last_evidence_ids',
      new_state->'evidence_ids',
      case when new_state->>'evidence_observation_id' is not null
        then jsonb_build_array(new_state->>'evidence_observation_id')
      end,
      '[]'::jsonb
    )
  ) as evidence_item(value);

  if old_state is distinct from new_state then
    insert into public.audit_logs (
      object_type, object_id, action_name, before_state, after_state,
      evidence_ids, actor_type, actor_id, reversible, rollback_data
    ) values (
      tg_table_name, new.id, case when tg_op = 'INSERT' then 'create' else 'state_update' end,
      old_state, new_state, evidence, actor_kind, actor_identifier, true, old_state
    );
  end if;
  return new;
end;
$$;

create trigger businesses_ontology_audit
after insert or update on public.businesses
for each row execute function public.audit_ontology_state_change();
create trigger websites_ontology_audit
after insert or update on public.websites
for each row execute function public.audit_ontology_state_change();
create trigger contacts_ontology_audit
after insert or update on public.contacts
for each row execute function public.audit_ontology_state_change();
create trigger opportunities_ontology_audit
after insert or update on public.opportunities
for each row execute function public.audit_ontology_state_change();
create trigger projects_ontology_audit
after insert or update on public.projects
for each row execute function public.audit_ontology_state_change();
create trigger website_audits_ontology_audit
after insert or update on public.website_audits
for each row execute function public.audit_ontology_state_change();
create trigger approvals_ontology_audit
after insert or update on public.approvals
for each row execute function public.audit_ontology_state_change();

create or replace function public.emit_approval_event()
returns trigger
language plpgsql
as $$
declare
  emitted_type text;
  event_actor_type text;
  event_actor_id text;
begin
  if tg_op = 'INSERT' then
    emitted_type := 'approval.requested';
    event_actor_type := new.requested_by_type;
    event_actor_id := new.requested_by_id;
  elsif old.status = 'pending' and new.status <> 'pending' then
    emitted_type := 'approval.resolved';
    event_actor_type := 'human';
    event_actor_id := new.resolved_by;
  else
    return new;
  end if;

  insert into public.domain_events (
    event_type, aggregate_type, aggregate_id, payload, evidence_ids,
    actor_type, actor_id, idempotency_key
  ) values (
    emitted_type, 'approval', new.id,
    jsonb_build_object('actionName', new.action_name, 'status', new.status),
    new.evidence_ids, event_actor_type, event_actor_id,
    emitted_type || ':' || new.id::text || ':' || new.status
  ) on conflict (idempotency_key) do nothing;
  return new;
end;
$$;

create trigger approvals_domain_event
after insert or update of status on public.approvals
for each row execute function public.emit_approval_event();

create or replace view public.companies
with (security_invoker = true)
as
select
  b.id,
  b.google_place_id as external_identity,
  b.name,
  b.address,
  b.state,
  b.city,
  b.territory_id,
  b.category_id,
  b.rating,
  b.review_count,
  b.company_state,
  b.canonical_fact_version,
  b.state_updated_at,
  b.first_seen_at,
  b.last_seen_at,
  b.created_at,
  b.updated_at
from public.businesses b;

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
  b.quality_checked_at,
  b.company_state,
  w.verification_status as website_verification_status,
  case when coalesce(c.email_count, 0) > 0 then 'verified' else 'unavailable' end as contact_verification_status,
  o.id as opportunity_id,
  o.qualification_state,
  o.sales_stage,
  coalesce(o.fit_score, s.fit_score) as fit_score,
  coalesce(o.need_score, s.need_score) as need_score,
  coalesce(o.reachability_score, s.reachability_score) as reachability_score,
  coalesce(o.value_score, s.value_score) as value_score,
  coalesce(o.confidence_score, s.confidence_score) as confidence_score,
  coalesce(ap.pending_approval_count, 0)::integer as pending_approval_count
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
) c on true
left join lateral (
  select latest.* from public.websites latest
  where latest.company_id = b.id order by latest.updated_at desc limit 1
) w on true
left join public.opportunities o on o.company_id = b.id and o.is_current
left join lateral (
  select count(*) as pending_approval_count
  from public.approvals approval
  where approval.status = 'pending'
    and (
      (approval.subject_type = 'opportunity' and approval.subject_id = o.id)
      or (approval.subject_type in ('demo', 'outreach') and approval.request_context->>'companyId' = b.id::text)
    )
) ap on true;

create or replace view public.growth_os_dashboard
with (security_invoker = true)
as
select
  (select count(*) from public.businesses)::integer as companies_total,
  (select count(*) from public.businesses where company_state = 'verified')::integer as companies_verified,
  (select count(*) from public.opportunities where is_current and qualification_state = 'qualified')::integer as opportunities_qualified,
  (select count(*) from public.opportunities where is_current and sales_stage in ('contacted', 'replied', 'meeting', 'proposal'))::integer as sales_pipeline_open,
  (select count(*) from public.approvals where status = 'pending')::integer as approvals_pending,
  (select count(*) from public.projects where status in ('active', 'blocked'))::integer as delivery_active,
  (select count(*) from public.agent_jobs where status in ('queued', 'running', 'needs_review'))::integer as agent_work_open;

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
  b.state,
  p.opportunity_id,
  o.sales_stage,
  coalesce(ap.pending_approval_count, 0)::integer as pending_approval_count
from public.projects p
join public.businesses b on b.id = p.business_id
left join public.opportunities o on o.id = p.opportunity_id
left join lateral (
  select count(*) as pending_approval_count
  from public.approvals approval
  where approval.subject_type = 'project'
    and approval.subject_id = p.id
    and approval.status = 'pending'
) ap on true;

create index if not exists websites_company_status_idx on public.websites (company_id, verification_status, updated_at desc);
create index if not exists contacts_company_status_idx on public.contacts (company_id, verification_status, updated_at desc);
create index if not exists audit_findings_audit_idx on public.audit_findings (website_audit_id, severity);
create index if not exists agent_jobs_action_queue_idx on public.agent_jobs (action_name, status, priority desc, requested_at);

alter table public.observations enable row level security;
alter table public.facts enable row level security;
alter table public.websites enable row level security;
alter table public.contacts enable row level security;
alter table public.audit_findings enable row level security;
alter table public.opportunities enable row level security;
alter table public.approvals enable row level security;
alter table public.domain_events enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.observations, public.facts, public.websites, public.contacts,
  public.audit_findings, public.opportunities, public.approvals,
  public.domain_events, public.audit_logs from anon, authenticated;
revoke all on public.companies, public.lead_dashboard, public.growth_os_dashboard,
  public.project_board from anon, authenticated;
revoke all on function public.promote_fact(text, uuid, text, jsonb, text, numeric, uuid, text, text, text)
  from anon, authenticated;

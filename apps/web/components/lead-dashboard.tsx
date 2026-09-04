"use client";

import { BUSINESS_CATEGORIES, TERRITORIES } from "@growth/lead-engine";
import { COMPANY_STATES, OPPORTUNITY_QUALIFICATION_STATES, SALES_STAGES } from "@growth/ontology";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LeadFilters, LeadRow } from "../lib/leads";

const EMPTY_FILTERS: LeadFilters = {};

function buildQuery(filters: LeadFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

function titleCase(value: string | null): string {
  return value ? value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "—";
}

export function LeadDashboard() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<LeadFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanTerritory, setScanTerritory] = useState("jersey-city");
  const [scanCategory, setScanCategory] = useState("dentists");
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const loadLeads = useCallback(async (nextFilters: LeadFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/leads?${buildQuery(nextFilters)}`, { cache: "no-store" });
      const payload = (await response.json()) as { rows?: LeadRow[]; count?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load leads");
      setRows(payload.rows ?? []);
      setTotal(payload.count ?? 0);
    } catch (loadError) {
      setRows([]);
      setTotal(0);
      setError(loadError instanceof Error ? loadError.message : "Could not load leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeads(EMPTY_FILTERS);
  }, [loadLeads]);

  const metrics = useMemo(
    () => [
      { label: "Matching companies", value: total.toLocaleString(), accent: "cyan" },
      { label: "Verified companies", value: rows.filter((row) => row.company_state === "verified").length.toLocaleString(), accent: "lime" },
      { label: "Qualified shown", value: rows.filter((row) => row.qualification_state === "qualified").length.toLocaleString(), accent: "amber" },
      { label: "Pending approvals", value: rows.reduce((sum, row) => sum + row.pending_approval_count, 0).toLocaleString(), accent: "violet" },
    ],
    [rows, total],
  );

  async function startScan() {
    setScanning(true);
    setScanMessage(null);
    try {
      const response = await fetch("/api/ingestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ territoryId: scanTerritory, categoryId: scanCategory, maxCells: 1, maxPagesPerCell: 1, maxBusinesses: 10 }),
      });
      const result = (await response.json()) as { businessesUpserted?: number; errors?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Scan failed");
      setScanMessage(`Scan complete · ${result.businessesUpserted ?? 0} businesses saved · ${result.errors ?? 0} errors`);
      await loadLeads(appliedFilters);
    } catch (scanError) {
      setScanMessage(scanError instanceof Error ? scanError.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  function applyFilters() {
    setAppliedFilters(filters);
    void loadLeads(filters);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    void loadLeads(EMPTY_FILTERS);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brandMark" aria-hidden="true"><span>NY</span><span>NJ</span></div>
        <div className="brandCopy">
          <p className="eyebrow">Company identity → opportunity qualification → sales</p>
          <h1>Company & opportunity pipeline</h1>
        </div>
        <div className="systemStatus"><i /> Compatibility layer on</div>
      </header>

      <section className="commandDeck" aria-labelledby="scan-heading">
        <div>
          <p className="eyebrow">Google Places ingestion</p>
          <h2 id="scan-heading">Scan one market cell</h2>
          <p>Raw provider results are stored as observations before deterministic identity resolution.</p>
        </div>
        <div className="scanControls">
          <label>Territory
            <select value={scanTerritory} onChange={(event) => setScanTerritory(event.target.value)}>
              {TERRITORIES.map((territory) => <option value={territory.id} key={territory.id}>{territory.label}, {territory.state}</option>)}
            </select>
          </label>
          <label>Category
            <select value={scanCategory} onChange={(event) => setScanCategory(event.target.value)}>
              {BUSINESS_CATEGORIES.map((category) => <option value={category.id} key={category.id}>{category.label}</option>)}
            </select>
          </label>
          <button className="primary" onClick={() => void startScan()} disabled={scanning}>
            {scanning ? "Scanning…" : "Start sample scan"}
          </button>
        </div>
        {scanMessage ? <p className="scanMessage" role="status">{scanMessage}</p> : null}
      </section>

      <section className="metricGrid" aria-label="Lead metrics">
        {metrics.map((metric) => (
          <article className={`metricCard ${metric.accent}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="workspace">
        <aside className="filters" aria-label="Lead filters">
          <div className="sectionHeading"><p className="eyebrow">Targeting</p><h2>Filters</h2></div>
          <div className="filterGrid">
            <label>State
              <select value={filters.state ?? ""} onChange={(event) => setFilters({ ...filters, state: event.target.value || undefined })}>
                <option value="">All states</option><option value="NY">New York</option><option value="NJ">New Jersey</option>
              </select>
            </label>
            <label>City
              <input value={filters.city ?? ""} onChange={(event) => setFilters({ ...filters, city: event.target.value || undefined })} placeholder="e.g. Hoboken" />
            </label>
            <label>Territory
              <select value={filters.territory ?? ""} onChange={(event) => setFilters({ ...filters, territory: event.target.value || undefined })}>
                <option value="">All territories</option>
                {TERRITORIES.map((territory) => <option value={territory.id} key={territory.id}>{territory.label}</option>)}
              </select>
            </label>
            <label>Category
              <select value={filters.category ?? ""} onChange={(event) => setFilters({ ...filters, category: event.target.value || undefined })}>
                <option value="">All categories</option>
                {BUSINESS_CATEGORIES.map((category) => <option value={category.id} key={category.id}>{category.label}</option>)}
              </select>
            </label>
            <label>Website
              <select value={filters.websiteStatus ?? ""} onChange={(event) => setFilters({ ...filters, websiteStatus: event.target.value || undefined })}>
                <option value="">Any status</option><option value="missing">No website</option><option value="unreachable">Unreachable</option><option value="weak">Weak</option><option value="reachable">Healthy</option><option value="unknown">Unknown / re-audit</option>
              </select>
            </label>
            <label>Tier
              <select value={filters.tier ?? ""} onChange={(event) => setFilters({ ...filters, tier: event.target.value || undefined })}>
                <option value="">All tiers</option>{["S", "A", "B", "C"].map((tier) => <option value={tier} key={tier}>{tier}</option>)}
              </select>
            </label>
            <label>Minimum score
              <input type="number" min="0" max="100" value={filters.minScore ?? ""} onChange={(event) => setFilters({ ...filters, minScore: event.target.value ? Number(event.target.value) : undefined })} placeholder="0" />
            </label>
            <label>Minimum rating
              <input type="number" min="0" max="5" step="0.5" value={filters.minRating ?? ""} onChange={(event) => setFilters({ ...filters, minRating: event.target.value ? Number(event.target.value) : undefined })} placeholder="0.0" />
            </label>
            <label>Minimum reviews
              <input type="number" min="0" value={filters.minReviews ?? ""} onChange={(event) => setFilters({ ...filters, minReviews: event.target.value ? Number(event.target.value) : undefined })} placeholder="0" />
            </label>
            <label>Public email
              <select value={filters.email ?? ""} onChange={(event) => setFilters({ ...filters, email: event.target.value === "yes" || event.target.value === "no" ? event.target.value : undefined })}>
                <option value="">Either</option><option value="yes">Available</option><option value="no">Not found</option>
              </select>
            </label>
            <label>Company state
              <select value={filters.companyState ?? ""} onChange={(event) => setFilters({ ...filters, companyState: event.target.value || undefined })}>
                <option value="">All states</option>
                {COMPANY_STATES.map((state) => <option value={state} key={state}>{titleCase(state)}</option>)}
              </select>
            </label>
            <label>Qualification
              <select value={filters.qualificationState ?? ""} onChange={(event) => setFilters({ ...filters, qualificationState: event.target.value || undefined })}>
                <option value="">All qualification states</option>
                {OPPORTUNITY_QUALIFICATION_STATES.map((state) => <option value={state} key={state}>{titleCase(state)}</option>)}
              </select>
            </label>
            <label>Sales stage
              <select value={filters.salesStage ?? ""} onChange={(event) => setFilters({ ...filters, salesStage: event.target.value || undefined })}>
                <option value="">All sales stages</option>
                {SALES_STAGES.map((stage) => <option value={stage} key={stage}>{titleCase(stage)}</option>)}
              </select>
            </label>
            <label>Legacy pipeline stage
              <select value={filters.pipelineStage ?? ""} onChange={(event) => setFilters({ ...filters, pipelineStage: event.target.value || undefined })}>
                <option value="">All stages</option>
                {["discovered", "qualified", "audit_ready", "demo_ready", "outreach_draft", "contacted", "replied", "meeting", "proposal", "won", "lost"].map((stage) => <option value={stage} key={stage}>{titleCase(stage)}</option>)}
              </select>
            </label>
          </div>
          <div className="filterActions">
            <button className="primary" onClick={applyFilters}>Apply filters</button>
            <button className="ghost" onClick={clearFilters}>Clear</button>
          </div>
        </aside>

        <section className="results" aria-labelledby="results-heading">
          <div className="resultsHeader">
            <div><p className="eyebrow">Context-layer read model</p><h2 id="results-heading">Companies and opportunity candidates</h2></div>
            <a className="exportButton" href={`/api/export?${buildQuery(appliedFilters)}`}>Export CSV</a>
          </div>

          {error ? <div className="notice errorNotice"><strong>Data connection needed</strong><p>{error}</p><span>Configure Supabase and apply the migration, then refresh.</span></div> : null}
          {!error && loading ? <div className="notice">Loading persisted leads…</div> : null}
          {!error && !loading && rows.length === 0 ? <div className="notice"><strong>No leads match yet.</strong><p>Run a sample scan or loosen the filters.</p></div> : null}

          {!error && rows.length > 0 ? (
            <div className="tableScroll">
              <table>
                <thead><tr><th>Company</th><th>Company state</th><th>Operating signals</th><th>Website fact</th><th>Opportunity</th><th>Qualification</th><th>Sales / approval</th><th>Public contact</th></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.name}</strong><span>{titleCase(row.category_id)}</span>{row.google_maps_url ? <a href={row.google_maps_url} target="_blank" rel="noreferrer">Open map ↗</a> : null}</td>
                      <td><span className="statusPill status-unknown">{titleCase(row.company_state)}</span><strong>{row.city}, {row.state}</strong><span>{row.address ?? "Address unavailable"}</span></td>
                      <td><strong>{row.rating ? `${Number(row.rating).toFixed(1)} ★` : "No rating"}</strong><span>{row.review_count.toLocaleString()} reviews</span></td>
                      <td><span className={`statusPill status-${row.website_status ?? "unknown"}`}>{row.lead_quality_status === "needs_reaudit" ? "Re-audit required" : titleCase(row.website_verification_status ?? row.website_status)}</span>{row.website_url ? <a href={row.website_url} target="_blank" rel="noreferrer">Visit site ↗</a> : <span>No URL listed</span>}</td>
                      <td><div className={`tier tier-${row.tier ?? "C"}`}>{row.tier ?? "—"}</div><strong>{row.opportunity_score ?? "—"}<small>/100 legacy</small></strong><span>Fit {row.fit_score ?? "—"} · Need {row.need_score ?? "—"}</span><span>Reach {row.reachability_score ?? "—"} · Value {row.value_score ?? "—"} · Confidence {row.confidence_score ?? "—"}</span></td>
                      <td><span className="statusPill status-unknown">{row.opportunity_id ? titleCase(row.qualification_state) : "No opportunity"}</span><span>{row.opportunity_id ? "Qualification is separate from sales." : "Company only"}</span></td>
                      <td><strong>{titleCase(row.sales_stage)}</strong><span>{row.pending_approval_count > 0 ? `${row.pending_approval_count} approval pending` : "No approval pending"}</span><small>Legacy: {titleCase(row.pipeline_stage)}</small></td>
                      <td>{row.primary_email ? <><a href={`mailto:${row.primary_email}`}>{row.primary_email}</a>{row.email_source_url ? <a href={row.email_source_url} target="_blank" rel="noreferrer">Verify source ↗</a> : null}</> : <span>Not found</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

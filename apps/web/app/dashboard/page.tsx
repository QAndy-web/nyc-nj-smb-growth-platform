import Link from "next/link";
import { getOperatingSummary, type OperatingSummary } from "../../lib/operating-state";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let summary: OperatingSummary | null = null;
  let error: string | null = null;
  try {
    summary = await getOperatingSummary();
  } catch (loadError) {
    error = loadError instanceof Error ? loadError.message : "Could not load operating state";
  }
  const metrics = [
    { label: "Verified companies", value: summary?.companies_verified, accent: "cyan" },
    { label: "Qualified opportunities", value: summary?.opportunities_qualified, accent: "lime" },
    { label: "Open sales pipeline", value: summary?.sales_pipeline_open, accent: "amber" },
    { label: "Pending approvals", value: summary?.approvals_pending, accent: "violet" },
  ] as const;
  return (
    <main className="shell">
      <header className="pageHeader"><div><p className="eyebrow">Business state · approvals · pipeline</p><h1>Growth command center</h1><p>The operating view is driven by canonical company state and qualified opportunities. Agents remain an execution layer behind contracts and review gates.</p></div><span className="systemStatus"><i /> Human review on</span></header>
      <section className="commandDeck">
        <div><p className="eyebrow">Next operator decision</p><h2>Review evidence before promoting an opportunity</h2><p>A discovered company is not automatically a lead. Verify identity, website and public contacts, then qualify the opportunity separately from its sales stage.</p></div>
        <Link className="primary actionLink" href="/pipeline">Review companies</Link>
      </section>
      <section className="metricGrid" aria-label="Operating metrics">
        {metrics.map((metric) => <article className={`metricCard ${metric.accent}`} key={metric.label}><span>{metric.label}</span><strong>{metric.value?.toLocaleString() ?? "—"}</strong></article>)}
      </section>
      {error ? <section className="notice errorNotice"><strong>Operating data unavailable</strong><p>{error}</p><span>Configure Supabase and apply migrations through 202609040002; no sample metrics are shown.</span></section> : null}
      <section className="results flowPanel"><div className="sectionHeading"><p className="eyebrow">State-driven operating flow</p><h2>Observation → fact → opportunity → approval → delivery</h2></div><ol className="flowSteps"><li><strong>Observe</strong><span>Keep raw provider and crawler evidence immutable.</span></li><li><strong>Resolve</strong><span>Promote only traceable evidence into canonical facts.</span></li><li><strong>Qualify</strong><span>Create an opportunity without conflating it with Company.</span></li><li><strong>Approve</strong><span>Require a human decision before any external effect.</span></li><li><strong>Deliver</strong><span>Create projects only after a won sales commitment.</span></li></ol></section>
      <section className="overviewGrid" aria-label="Execution layer">
        <article className="overviewCard"><span>{summary?.agent_work_open ?? "—"} open</span><h2>Agent execution</h2><p>Agents can append evidence and request legal transitions only through registered actions.</p><Link href="/agents">Open execution layer</Link></article>
        <article className="overviewCard"><span>{summary?.delivery_active ?? "—"} active</span><h2>Delivery projects</h2><p>Projects stay separate from discovery and sales qualification.</p><Link href="/projects">Open projects</Link></article>
        <article className="overviewCard"><span>{summary?.companies_total ?? "—"} total</span><h2>Company context</h2><p>Legacy Lead Engine records remain available through the compatibility view.</p><Link href="/pipeline">Inspect pipeline</Link></article>
      </section>
    </main>
  );
}

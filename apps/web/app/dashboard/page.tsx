import Link from "next/link";

const SYSTEMS = [
  { name: "Lead Engine", status: "Implemented", detail: "Places ingestion, audit, enrichment, scoring, filters and CSV." },
  { name: "Agent Queue", status: "Foundation", detail: "Typed job contracts and a persistent queue API are ready for workers." },
  { name: "Project Tracker", status: "Foundation", detail: "Delivery stages, progress and blockers now have a durable model." },
] as const;

export default function DashboardPage() {
  return (
    <main className="shell">
      <header className="pageHeader"><div><p className="eyebrow">Sprint 1 · Platform foundation</p><h1>Growth command center</h1><p>One operating surface from lead discovery to a reviewable client delivery project.</p></div><span className="systemStatus"><i /> Review branch</span></header>
      <section className="commandDeck">
        <div><p className="eyebrow">Current focus</p><h2>Validate the sales funnel before automating execution</h2><p>Phase 1 lead discovery is built. This Sprint connects pipeline, agent jobs and delivery tracking without enabling automatic outreach.</p></div>
        <Link className="primary actionLink" href="/pipeline">Open lead pipeline</Link>
      </section>
      <section className="overviewGrid" aria-label="Platform systems">
        {SYSTEMS.map((system) => <article className="overviewCard" key={system.name}><span>{system.status}</span><h2>{system.name}</h2><p>{system.detail}</p></article>)}
      </section>
      <section className="results flowPanel"><div className="sectionHeading"><p className="eyebrow">Operating flow</p><h2>Lead → evidence → review → delivery</h2></div><ol className="flowSteps"><li><strong>Scout</strong><span>Find qualified public business records.</span></li><li><strong>Audit</strong><span>Produce source-backed website findings.</span></li><li><strong>Demo</strong><span>Create a preview for human review.</span></li><li><strong>Outreach</strong><span>Draft only; a person approves and sends.</span></li><li><strong>Project</strong><span>Track build, QA, launch and maintenance.</span></li></ol></section>
    </main>
  );
}

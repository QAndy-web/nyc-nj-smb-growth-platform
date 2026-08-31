const metrics = [
  ["Businesses scanned", "0"],
  ["Qualified leads", "0"],
  ["Tier S", "0"],
  ["Public emails found", "0"],
];

export default function HomePage() {
  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Phase 1 · Lead Engine</p>
          <h1>NYC + NJ SMB Growth Platform</h1>
          <p className="lede">
            Find strong local businesses with weak digital presence, prioritize them, and turn them into website-growth opportunities.
          </p>
        </div>
        <button className="primary" disabled>Start scan</button>
      </header>

      <section className="metricGrid" aria-label="Lead engine metrics">
        {metrics.map(([label, value]) => (
          <article className="card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Pipeline</p>
            <h2>Lead discovery is ready for integration</h2>
          </div>
        </div>
        <div className="emptyState">
          <p>Next: connect Google Places, persist businesses, audit websites, enrich public business emails, and score opportunities.</p>
        </div>
      </section>
    </main>
  );
}

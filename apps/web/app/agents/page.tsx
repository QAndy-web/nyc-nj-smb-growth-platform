import { AGENT_CATALOG } from "@growth/agent-core";

export default function AgentsPage() {
  return (
    <main className="shell">
      <header className="pageHeader"><div><p className="eyebrow">1 orchestrator + specialists</p><h1>Agent operations</h1><p>Jobs are durable, idempotent and review-gated. Sprint 1 creates the queue and contracts; workers arrive next.</p></div></header>
      <section className="agentGrid">
        {AGENT_CATALOG.map((agent) => <article className="overviewCard" key={agent.type}><span>{agent.type.replaceAll("_", " ")}</span><h2>{agent.label}</h2><p>{agent.purpose}</p><small>{agent.reviewGate}</small></article>)}
      </section>
      <section className="notice"><strong>No autonomous sends or publishes.</strong><p>The API accepts queued jobs only. Demo sharing, outreach and launch remain human decisions.</p><span>POST /api/agent-jobs · GET /api/agent-jobs</span></section>
    </main>
  );
}

import { ACTION_REGISTRY, AGENT_CATALOG } from "@growth/agent-core";

const REGISTERED_AGENT_ACTIONS = Object.values(ACTION_REGISTRY).filter((action) => action.allowedAgents.length > 0);
const HUMAN_ONLY_ACTIONS = Object.values(ACTION_REGISTRY).filter((action) => action.approvalPolicy === "human_only");

export default function AgentsPage() {
  return (
    <main className="shell">
      <header className="pageHeader"><div><p className="eyebrow">Execution layer · not the source of truth</p><h1>Agent operations</h1><p>Agents read business state, append evidence and request registered actions. They cannot invent canonical facts or bypass legal state transitions and human approvals.</p></div></header>
      <section className="agentGrid">
        {AGENT_CATALOG.map((agent) => <article className="overviewCard" key={agent.type}><span>{agent.type.replaceAll("_", " ")}</span><h2>{agent.label}</h2><p>{agent.purpose}</p><small>{agent.reviewGate}</small></article>)}
      </section>
      <section className="results flowPanel">
        <div className="sectionHeading"><p className="eyebrow">Action registry</p><h2>Allowed contract actions</h2></div>
        <div className="overviewGrid">
          {REGISTERED_AGENT_ACTIONS.map((action) => <article className="overviewCard" key={action.name}><span>{action.allowedAgents.join(" · ")}</span><h2>{action.label}</h2><p>{action.requiresEvidence ? "Evidence IDs required before execution." : "Produces a plan or raw observation; no canonical state is implied."}</p><small>{action.transitionEntity ? `${action.transitionEntity} state transition validated` : `${action.entityType} action`} · {action.externalEffect ? "external effect" : "internal only"}</small></article>)}
        </div>
      </section>
      <section className="notice"><strong>No autonomous sends, shares or launches.</strong><p>{HUMAN_ONLY_ACTIONS.map((action) => action.label).join(", ")} are registered as human-only boundaries. The API queues work; it does not execute external actions.</p><span>POST /api/agent-jobs · GET /api/agent-jobs</span></section>
    </main>
  );
}

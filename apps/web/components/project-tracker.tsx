"use client";

import { useEffect, useState } from "react";
import type { ProjectRow } from "../lib/projects";

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ProjectTracker() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/projects", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { rows?: ProjectRow[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Could not load projects");
        if (active) setProjects(payload.rows ?? []);
      })
      .catch((loadError: unknown) => active && setError(loadError instanceof Error ? loadError.message : "Could not load projects"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  return (
    <main className="shell">
      <header className="pageHeader"><div><p className="eyebrow">Won opportunity → client delivery</p><h1>Project tracker</h1><p>Projects begin after a real sales commitment. Delivery state stays separate from Company identity, opportunity qualification and the sales pipeline.</p></div></header>
      {error ? <section className="notice errorNotice"><strong>Data connection needed</strong><p>{error}</p><span>Apply the Growth OS migration after configuring Supabase.</span></section> : null}
      {!error && loading ? <section className="notice">Loading projects…</section> : null}
      {!error && !loading && projects.length === 0 ? <section className="notice"><strong>No delivery projects yet.</strong><p>Promote a qualified lead only after a real sales commitment.</p><span>Project creation UI is intentionally scheduled after pipeline validation.</span></section> : null}
      {!error && projects.length > 0 ? <section className="projectGrid">{projects.map((project) => <article className="overviewCard" key={project.id}><span>{label(project.status)} · {label(project.stage)}</span><h2>{project.name}</h2><p>{project.business_name} · {project.city}, {project.state}</p><div className="progressTrack"><i style={{ width: `${project.progress_percent}%` }} /></div><strong>{project.progress_percent}%</strong><small>{project.blocker ? `Blocked: ${project.blocker}` : project.next_action ?? "No next action recorded"}</small><small>Sales: {label(project.sales_stage ?? "not_started")} · Approvals: {project.pending_approval_count}</small></article>)}</section> : null}
    </main>
  );
}

import { createAdminClient } from "./supabase";

export type ProjectRow = {
  id: string;
  business_id: string;
  name: string;
  stage: "discovery" | "audit" | "demo" | "sales" | "onboarding" | "build" | "client_review" | "launch" | "maintenance";
  status: "planned" | "active" | "blocked" | "completed" | "cancelled";
  progress_percent: number;
  next_action: string | null;
  blocker: string | null;
  target_launch_at: string | null;
  updated_at: string;
  business_name: string;
  city: string;
  state: "NY" | "NJ";
};

export async function listProjects(limit = 100): Promise<ProjectRow[]> {
  const { data, error } = await createAdminClient().from("project_board").select("*").order("updated_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`Could not load projects: ${error.message}`);
  return (data ?? []) as ProjectRow[];
}

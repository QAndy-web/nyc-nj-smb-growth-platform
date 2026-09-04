import { createAdminClient } from "./supabase";

export type OperatingSummary = {
  companies_total: number;
  companies_verified: number;
  opportunities_qualified: number;
  sales_pipeline_open: number;
  approvals_pending: number;
  delivery_active: number;
  agent_work_open: number;
};

export async function getOperatingSummary(): Promise<OperatingSummary> {
  const { data, error } = await createAdminClient().from("growth_os_dashboard").select("*").single();
  if (error || !data) throw new Error(`Could not load operating state: ${error?.message ?? "no dashboard row"}`);
  return data as OperatingSummary;
}

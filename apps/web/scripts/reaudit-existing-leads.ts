import { reauditExistingLead } from "@growth/lead-engine";
import { SupabaseLeadRepository } from "../lib/supabase-repository";

function readLimit(args: string[]): number {
  const index = args.indexOf("--limit");
  const parsed = index >= 0 ? Number(args[index + 1]) : 25;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error("--limit must be an integer from 1 to 100");
  }
  return parsed;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const limit = readLimit(args);
  const repository = new SupabaseLeadRepository();
  const leads = await repository.listBusinessesNeedingReaudit(limit);

  if (!apply) {
    console.log(`Dry run: ${leads.length} existing lead(s) need re-audit. Use --apply to process this batch.`);
    return;
  }

  let completed = 0;
  let failed = 0;
  for (const lead of leads) {
    try {
      await reauditExistingLead({ repository }, lead);
      completed += 1;
      console.log(`Re-audited: ${lead.name}`);
    } catch (error) {
      failed += 1;
      console.error(`Re-audit failed: ${lead.name}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  console.log(`Re-audit batch complete: ${completed} verified, ${failed} still need review.`);
  if (failed > 0) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Re-audit failed");
  process.exitCode = 1;
});

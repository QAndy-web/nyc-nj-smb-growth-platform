import { leadsToCsv, listLeads, parseLeadFilters } from "../../../lib/leads";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const filters = parseLeadFilters(new URL(request.url).searchParams);
    const { rows } = await listLeads(filters, 5_000);
    return new Response(`\uFEFF${leadsToCsv(rows)}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nyc-nj-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not export leads" },
      { status: 503 },
    );
  }
}

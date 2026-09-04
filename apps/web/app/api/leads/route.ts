import { NextResponse } from "next/server";
import { listLeads, parseLeadFilters } from "../../../lib/leads";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const filters = parseLeadFilters(new URL(request.url).searchParams);
    const result = await listLeads(filters);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load leads" },
      { status: 503 },
    );
  }
}

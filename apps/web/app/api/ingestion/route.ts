import { GooglePlacesProvider, runIngestion } from "@growth/lead-engine";
import { getIngestionEnv } from "../../../lib/env";
import { SupabaseLeadRepository } from "../../../lib/supabase-repository";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function boundedInteger(value: unknown, fallback: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isInteger(value)) return fallback;
  return Math.min(Math.max(value, 1), maximum);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.territoryId !== "string" || typeof body.categoryId !== "string") {
      return Response.json({ error: "territoryId and categoryId are required." }, { status: 400 });
    }
    const env = getIngestionEnv();
    const summary = await runIngestion(
      {
        provider: new GooglePlacesProvider({ apiKey: env.googleMapsApiKey }),
        repository: new SupabaseLeadRepository(),
      },
      {
        territoryId: body.territoryId,
        categoryId: body.categoryId,
        maxCells: boundedInteger(body.maxCells, 1, 5),
        maxPagesPerCell: boundedInteger(body.maxPagesPerCell, 1, 3),
      },
    );
    return Response.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingestion failed";
    const status = /Missing required environment variable|Unknown territory|Unknown business category/.test(message) ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}

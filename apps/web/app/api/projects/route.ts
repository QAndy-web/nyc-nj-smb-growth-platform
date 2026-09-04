import { listProjects } from "../../../lib/projects";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ rows: await listProjects() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load projects" }, { status: 503 });
  }
}

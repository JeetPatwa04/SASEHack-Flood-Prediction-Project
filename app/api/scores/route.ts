import { getScores } from "@/lib/data";

// GET /api/scores -> the scoreboard for every gauge and lead time
export async function GET() {
  try {
    return Response.json(await getScores());
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

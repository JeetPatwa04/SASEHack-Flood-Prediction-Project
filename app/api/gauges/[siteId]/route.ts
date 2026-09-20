import { getContext, getLatest, getScores, isValidSiteId } from "@/lib/data";

// GET /api/gauges/USGS-03524000 -> everything for one gauge
export async function GET(_req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  if (!isValidSiteId(siteId)) return Response.json({ error: "Bad gauge id" }, { status: 400 });
  try {
    const [latest, scores, context] = await Promise.all([getLatest(), getScores(), getContext()]);
    const gauge = latest.gauges.find((g) => g.site_id === siteId);
    if (!gauge) return Response.json({ error: `Unknown gauge ${siteId}` }, { status: 404 });
    return Response.json({
      generated_at: latest.generated_at,
      is_sample_data: latest.is_sample_data,
      gauge,
      scores: scores.gauges[siteId] ?? null,
      context: context?.gauges[siteId] ?? null,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}


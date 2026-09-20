import { getLatest } from "@/lib/data";

// GET /api/gauges -> a short summary of every gauge (for the map and the gauge cards)
export async function GET() {
  try {
    const latest = await getLatest();
    const gauges = latest.gauges.map((g) => ({
      site_id: g.site_id,
      nws_id: g.nws_id,
      name: g.name,
      chain: g.chain,
      upstream_site_id: g.upstream_site_id,
      latitude: g.latitude,
      longitude: g.longitude,
      current: g.current,
      risk: g.risk,
    }));
    return Response.json({
      generated_at: latest.generated_at,
      is_sample_data: latest.is_sample_data,
      model_version: latest.model_version,
      gauges,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

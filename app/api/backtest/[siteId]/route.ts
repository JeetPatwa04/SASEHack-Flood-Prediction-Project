import { getBacktest, isValidSiteId } from "@/lib/data";
//storm replay data for the last two years, for one gauge

// GET /api/backtest/USGS-03524000 -> two years of "what we forecast 24 hours ahead vs what happened"
export async function GET(_req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  if (!isValidSiteId(siteId)) return Response.json({ error: "Bad gauge id" }, { status: 400 });
  try {
    return Response.json(await getBacktest(siteId));
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

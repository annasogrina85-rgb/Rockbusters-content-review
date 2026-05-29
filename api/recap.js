import { buildRecap, findReadyCamps } from './_lib/recap-build.js';

/**
 * Recap endpoint.
 *   GET /api/recap?camp=Rodellar%202026-05   → build one camp's recap
 *   GET /api/recap                            → build all READY camps (auto-detect)
 * Auth: same CRON_SECRET as the other cron endpoints.
 */
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  if (secret && auth !== `Bearer ${secret}` && req.query?.key !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const camp = req.query?.camp;
    const slides = Number(req.query?.slides) || 4;
    if (camp) {
      const r = await buildRecap(camp, { slides });
      return res.status(200).json({ ok: true, built: [r] });
    }
    const camps = await findReadyCamps();
    const built = [];
    for (const c of camps) {
      try { built.push({ camp: c, ...(await buildRecap(c, { slides })) }); }
      catch (e) { built.push({ camp: c, error: e.message }); }
    }
    return res.status(200).json({ ok: true, readyCamps: camps, built });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

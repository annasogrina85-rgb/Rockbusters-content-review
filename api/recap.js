import { buildRecap, findReadyCamps } from './_lib/recap-build.js';

/**
 * Recap endpoint.
 *   GET /api/recap?camp=Rodellar%202026-05   → build one camp's recap
 *   GET /api/recap                            → build all READY camps (auto-detect)
 * Auth: same CRON_SECRET as the other cron endpoints.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  const authed = !secret || auth === `Bearer ${secret}` || req.query?.key === secret;

  try {
    const camp = req.query?.camp;
    const slides = Number(req.query?.slides) || 4;
    if (camp) {
      // Building one named camp is allowed from the review app (no secret) —
      // it only reads an existing Drive folder and adds a draft for review.
      const r = await buildRecap(camp, { slides });
      return res.status(200).json({ ok: true, built: [r] });
    }
    // The "build all ready camps" sweep stays secret-protected (cron only).
    if (!authed) return res.status(401).json({ error: 'Unauthorized' });
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

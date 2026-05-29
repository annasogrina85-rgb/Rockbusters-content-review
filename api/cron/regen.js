import { runRegen } from '../_lib/regen.js';

/**
 * Standalone regeneration endpoint — for manual triggering / testing.
 * The scheduled crons run regen automatically inside /api/cron/notify,
 * so this is not on a schedule itself.
 *
 * Auth: same CRON_SECRET as the other cron endpoints.
 *   curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/regen
 */
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  const keyParam = req.query?.key;
  if (secret && auth !== `Bearer ${secret}` && keyParam !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const limit = Number(req.query?.limit) || 6;
    const result = await runRegen({ limit });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

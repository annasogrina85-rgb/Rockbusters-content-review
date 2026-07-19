import { listBrands, planRows, scheduleAll, creds } from './_lib/metricool.js';

/**
 * Metricool control endpoint.
 *   GET /api/metricool?action=status    → is it configured?
 *   GET /api/metricool?action=brands    → list brands (find your blogId)
 *   GET /api/metricool?action=preview   → DRY RUN: exactly what would be scheduled
 *   GET /api/metricool?action=schedule  → push to Metricool as DRAFTS (safe)
 *       &live=1                         → schedule for real auto-publish
 *       &only=<draft name>              → just one post
 *
 * Auth: CRON_SECRET (Bearer header or ?key=). Anything that writes to
 * Metricool requires it — preview does not touch Metricool at all.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  const authed = !secret || auth === `Bearer ${secret}` || req.query?.key === secret;
  const action = req.query?.action || 'status';

  try {
    if (action === 'status') {
      const c = creds();
      return res.json({
        configured: c.configured,
        hasBlogId: Boolean(c.blogId),
        needs: c.configured ? [] : ['METRICOOL_USER_TOKEN', 'METRICOOL_USER_ID', 'METRICOOL_BLOG_ID'],
        note: 'Metricool API requires an Advanced plan or above.',
      });
    }

    if (action === 'preview') {
      // Dry run — reads our own plan/drafts only, never calls Metricool.
      const rows = await planRows();
      return res.json({
        ready: rows.filter(r => !r.skip).map(r => ({
          date: r.date, name: r.name, type: r.type, images: r.images,
          parts: r.posts.length, firstAt: r.posts[0].publicationDate.dateTime,
        })),
        skipped: rows.filter(r => r.skip).map(r => ({ date: r.date, name: r.name, reason: r.skip })),
      });
    }

    if (!authed) return res.status(401).json({ error: 'Unauthorized' });

    if (action === 'brands') return res.json(await listBrands());

    if (action === 'schedule') {
      const live = req.query?.live === '1';
      const results = await scheduleAll({ asDraft: !live, only: req.query?.only || null });
      return res.json({
        mode: live ? 'scheduled for auto-publish' : 'created as drafts in Metricool (review there, nothing publishes)',
        sent: results.length, results,
      });
    }

    return res.status(400).json({ error: `unknown action: ${action}` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

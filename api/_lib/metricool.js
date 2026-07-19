import { kv } from '@vercel/kv';

/**
 * Metricool integration — turns approved drafts + the posting schedule into
 * scheduled Instagram posts in Metricool.
 *
 * API contract (verified against Metricool's public API, July 2026):
 *   base   https://app.metricool.com/api
 *   auth   header `X-Mc-Auth: <userToken>` + query `userToken`, `userId`, `blogId`
 *   brands GET  /admin/simpleProfiles            → find your blogId
 *   create POST /v2/scheduler/posts
 *          { text, providers:[{network:'instagram'}],
 *            publicationDate:{ dateTime:'YYYY-MM-DDTHH:mm:ss', timezone },
 *            media:[ '<public image url>', … ],   // carousel = several URLs
 *            draft, autoPublish,
 *            instagramData:{ type: 'POST' | 'REEL' | 'STORY' } }
 *
 * Requires a Metricool **Advanced** plan or above (API access).
 * Our images are already public Vercel Blob URLs, so no upload step is needed.
 */

const BASE = 'https://app.metricool.com/api';
const TZ = 'Europe/Madrid';
const DEFAULT_TIME = '10:00:00';

function creds() {
  const userToken = process.env.METRICOOL_USER_TOKEN;
  const userId = process.env.METRICOOL_USER_ID;
  const blogId = process.env.METRICOOL_BLOG_ID;
  return { userToken, userId, blogId, configured: Boolean(userToken && userId) };
}

async function mcRequest(path, { method = 'GET', body, blogId } = {}) {
  const { userToken, userId, blogId: defaultBlog } = creds();
  if (!userToken || !userId) throw new Error('Metricool not configured (METRICOOL_USER_TOKEN / METRICOOL_USER_ID)');

  const url = new URL(BASE + path);
  url.searchParams.set('userToken', userToken);
  url.searchParams.set('userId', userId);
  const bid = blogId || defaultBlog;
  if (bid) url.searchParams.set('blogId', bid);

  const r = await fetch(url, {
    method,
    headers: { 'X-Mc-Auth': userToken, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!r.ok) throw new Error(`Metricool ${r.status}: ${String(text).slice(0, 300)}`);
  return data;
}

/** List the brands on the account — use this to discover blogId. */
export async function listBrands() {
  return mcRequest('/admin/simpleProfiles');
}

/**
 * Publish-ready image URLs, in order.
 * ONLY `draft.rendered` counts — those are the branded images produced from the
 * design-system templates (logo, headline, red accents). The raw photos on
 * slides/frames are pre-branding source material and must never be published.
 */
function mediaFor(draft) {
  const rendered = Array.isArray(draft.rendered) ? draft.rendered : [];
  return rendered.filter(u => typeof u === 'string' && u.startsWith('http'));
}

/**
 * Map one draft + date into Metricool post payload(s).
 * Story sequences become one STORY post per frame (Instagram stories are single-media).
 */
export function buildPayloads(draft, dateISO, { time = DEFAULT_TIME, asDraft = true } = {}) {
  const media = mediaFor(draft);
  if (!media.length) return { error: 'no branded images (draft.rendered empty)' };

  const base = {
    providers: [{ network: 'instagram' }],
    publicationDate: { dateTime: `${dateISO}T${time}`, timezone: TZ },
    draft: asDraft,
    autoPublish: !asDraft,
  };

  if (Array.isArray(draft.frames) && draft.frames.length) {
    // Highlights: a story per frame, 5 minutes apart, so they land in order
    return {
      posts: media.map((url, i) => {
        const mm = String(Number(time.slice(3, 5)) + i * 5).padStart(2, '0');
        return {
          ...base,
          text: '',
          media: [url],
          publicationDate: { dateTime: `${dateISO}T${time.slice(0, 3)}${mm}:00`, timezone: TZ },
          instagramData: { type: 'STORY' },
        };
      }),
    };
  }

  // Feed post — carousel when there are several images
  return {
    posts: [{
      ...base,
      text: draft.caption || '',
      media,
      instagramData: { type: 'POST' },
    }],
  };
}

/**
 * Work out what should be scheduled: the plan's posting_schedule entries whose
 * draft is approved and has images. Returns rows for preview or sending.
 */
export async function planRows() {
  let plan = await kv.get('content-plan');
  if (typeof plan === 'string') plan = JSON.parse(plan);
  const schedule = plan?.posting_schedule || [];

  const rows = [];
  for (const item of schedule) {
    if (!item.name || item.name === 'highlights_setup') continue;
    let d = await kv.get(`draft:${item.name}`);
    if (typeof d === 'string') d = JSON.parse(d);
    if (!d) { rows.push({ ...item, skip: 'draft not found' }); continue; }

    const status = d._meta?.status;
    if (status !== 'approved') { rows.push({ ...item, status, skip: `not approved (${status})` }); continue; }

    const built = buildPayloads(d, item.date);
    if (built.error) { rows.push({ ...item, status, skip: built.error + ' — run the branded render step first' }); continue; }
    rows.push({ ...item, status, type: d.type, images: built.posts.reduce((n, p) => n + p.media.length, 0), posts: built.posts });
  }
  return rows;
}

/** Send the ready rows to Metricool. `asDraft` keeps them un-published for review. */
export async function scheduleAll({ asDraft = true, only = null } = {}) {
  const rows = await planRows();
  const results = [];
  for (const row of rows) {
    if (row.skip || !row.posts) continue;
    if (only && row.name !== only) continue;
    for (const [i, p] of row.posts.entries()) {
      const payload = { ...p, draft: asDraft, autoPublish: !asDraft };
      try {
        const res = await mcRequest('/v2/scheduler/posts', { method: 'POST', body: payload });
        results.push({ name: row.name, part: i + 1, ok: true, id: res?.data?.id ?? res?.id ?? null, date: p.publicationDate.dateTime });
      } catch (e) {
        results.push({ name: row.name, part: i + 1, ok: false, error: e.message });
      }
    }
  }
  return results;
}

export { creds };

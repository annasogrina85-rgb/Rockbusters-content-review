/**
 * Content-plan review — a deterministic audit run on each cron tick.
 * Surfaces issues the plain todo list doesn't: camps approaching with no
 * approved announcement, camps that have passed, and a stale plan.
 *
 * Returns an array of findings: { level: 'high'|'info', text }.
 */

const DAY = 86400000;
const STOP = new Set(['a', 'the', 'and', 'of', 'camp', 'climbing', 'rock', 'lab', 'summer', 'announcement', 'promo', 'post']);

function tokens(s) {
  return String(s).toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2 && !STOP.has(t));
}

export function reviewPlan(plan, kvDrafts, now = new Date()) {
  const findings = [];
  const posts = plan.posts || [];

  // Helper: find an announcement-type post matching a camp by token overlap
  const announcementFor = (campName) => {
    const ct = new Set(tokens(campName));
    let best = null, bestScore = 0;
    for (const p of posts) {
      if (!/announc/i.test(p.name) && p.type !== 'carousel') continue;
      const score = tokens(p.name).filter(t => ct.has(t)).length;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return bestScore > 0 ? best : null;
  };

  for (const camp of (plan.upcoming_camps || [])) {
    if (camp._note) continue;
    const date = new Date(camp.date);
    if (isNaN(date)) continue;
    const days = Math.ceil((date - now) / DAY);

    if (days < 0) {
      findings.push({ level: 'info', text: `🗑 "${camp.name}" was ${camp.date} — it has passed. Archive or repurpose its posts.` });
      continue;
    }
    if (days <= 21) {
      const post = announcementFor(camp.name);
      if (!post) {
        findings.push({ level: 'high', text: `⏰ "${camp.name}" in ${days} day${days === 1 ? '' : 's'} — no announcement post exists yet.` });
      } else {
        const status = kvDrafts[post.name]?.status || post.status || 'pending';
        if (status !== 'approved') {
          const blocker = post.blocker ? ` (blocked: ${post.blocker})` : '';
          findings.push({ level: 'high', text: `⏰ "${camp.name}" in ${days} day${days === 1 ? '' : 's'} — announcement "${post.name.replace(/_/g, ' ')}" is ${status}, not approved${blocker}.` });
        }
      }
    }
  }

  // Stale plan
  if (plan.updated) {
    const age = Math.floor((now - new Date(plan.updated)) / DAY);
    if (age > 14) findings.push({ level: 'info', text: `📅 Content plan not updated in ${age} days (since ${plan.updated}).` });
  }

  return findings;
}

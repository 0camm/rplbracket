// Vercel Serverless Function: /api/bracket
// GET  -> public, returns the current bracket JSON (or null)
// POST -> admin only (Authorization: Bearer <session token from /api/verify-admin>),
//         overwrites the current bracket JSON
//
// Upstash Redis credentials live only in Vercel Environment Variables:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
// They are never sent to the browser.

import { requireAdmin } from './_lib/auth.js';

const KEY = 'rpl-bracket-s11';

function env() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN missing');
  return { url, token };
}

async function redisGet(key) {
  const { url, token } = env();
  const r = await fetch(`${url}/get/${key}`, { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json();
  return j.result ? JSON.parse(j.result) : null;
}

async function redisSet(key, data) {
  const { url, token } = env();
  const r = await fetch(`${url}/set/${key}/${encodeURIComponent(JSON.stringify(data))}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json();
  return j.result === 'OK';
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const data = await redisGet(KEY);
      return res.status(200).json({ ok: true, data });
    }

    if (req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_) { body = null; }
      }
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ ok: false, error: 'Invalid bracket payload' });
      }
      const ok = await redisSet(KEY, body);
      if (!ok) return res.status(502).json({ ok: false, error: 'Failed to write bracket data' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Server error: ' + e.message });
  }
}

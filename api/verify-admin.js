// Vercel Serverless Function: POST /api/verify-admin
// Checks a submitted password against the ADMIN_PASSWORD environment variable.
// Set ADMIN_PASSWORD (and optionally SESSION_SECRET) in your Vercel project:
// Settings -> Environment Variables.
// Never expose the real password in client-side code — this endpoint is the
// only place it's compared. On success it issues a short-lived signed
// session token; the client uses that token (not the password) to
// authorize subsequent admin writes.

import { generateToken } from './_lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    // Fails closed if the env var hasn't been set on Vercel yet.
    return res.status(500).json({ ok: false, error: 'Server not configured (ADMIN_PASSWORD missing)' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  const password = body && body.password;

  if (typeof password === 'string' && password === expected) {
    const { token, expiresAt } = generateToken();
    return res.status(200).json({ ok: true, token, expiresAt });
  }

  return res.status(401).json({ ok: false, error: 'Wrong password.' });
}

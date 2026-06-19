// Vercel Serverless Function: POST /api/verify-admin
// Checks a submitted password against the ADMIN_PASSWORD environment variable.
// Set ADMIN_PASSWORD in your Vercel project: Settings -> Environment Variables.
// Never expose the real password in client-side code — this endpoint is the
// only place it's compared.

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
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false, error: 'Wrong password.' });
}

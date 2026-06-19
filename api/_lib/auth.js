// Shared helper used by serverless functions to issue and verify
// short-lived admin session tokens after a successful password check.
// The token never contains the password itself, and is signed with a
// server-only secret (SESSION_SECRET, falling back to ADMIN_PASSWORD if
// SESSION_SECRET isn't set). Nothing here is exposed to the client.

import crypto from 'crypto';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function getSecret() {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error('SESSION_SECRET or ADMIN_PASSWORD must be set');
  return secret;
}

export function generateToken() {
  const expiry = Date.now() + TOKEN_TTL_MS;
  const sig = crypto.createHmac('sha256', getSecret()).update(String(expiry)).digest('hex');
  return { token: `${expiry}.${sig}`, expiresAt: expiry };
}

export function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [expiryStr, sig] = token.split('.');
  const expiry = Number(expiryStr);
  if (!expiry || Number.isNaN(expiry) || Date.now() > expiry) return false;
  const expectedSig = crypto.createHmac('sha256', getSecret()).update(String(expiry)).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

export function requireAdmin(req, res) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !verifyToken(token)) {
    res.status(401).json({ ok: false, error: 'Unauthorized. Please unlock the admin panel again.' });
    return false;
  }
  return true;
}

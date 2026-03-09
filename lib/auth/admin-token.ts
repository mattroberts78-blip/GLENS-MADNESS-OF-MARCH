import crypto from 'crypto';

const SECRET = process.env.POSTGRES_URL ?? 'glens-madness-fallback-secret';

export function signAdminToken(): string {
  const payload = Buffer.from(JSON.stringify({ adm: true, ts: Date.now() })).toString('base64');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string): boolean {
  const dot = token.indexOf('.');
  if (dot < 0) return false;
  const payload = token.substring(0, dot);
  const sig = token.substring(dot + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  if (sig !== expected) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    if (!data.adm) return false;
    if (Date.now() - data.ts > 3_600_000) return false; // 1 hour expiry
    return true;
  } catch {
    return false;
  }
}

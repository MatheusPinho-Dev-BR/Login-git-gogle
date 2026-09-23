export async function onRequestGet(context) {
 const cookieHeader = context.request.headers.get('Cookie') || '';
  const cookies = Object.fromEntries(cookieHeader.split(';').map(c => c.trim().split('=')));
  const sessionId = cookies['Host-session'];

  if (!sessionId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const encoder = new TextEncoder();
  const digestSession = await crypto.subtle.digest('SHA-256', encoder.encode(sessionId));
  const sessionIdHash = btoa(String.fromCharCode(...new Uint8Array(digestSession)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const db = context.env.DB;
  const now = Math.floor(Date.now() / 1000);

  const session = await db.prepare(
    `SELECT * FROM sessions WHERE id_hash = ? AND expires_at > ?`
  ).bind(sessionIdHash, now).first();

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  return Response.json({
    email: session.email,
    displayName: session.display_name,
    issuer: session.issuer
  }, {
    headers: { 'Cache-Control': 'no-store' }
  });
}

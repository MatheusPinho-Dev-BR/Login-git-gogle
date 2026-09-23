export async function onRequestPost(context) {
  const request = context.request;
  const origin = request.headers.get('Origin');
  const baseUrl = context.env.PUBLIC_BASE_URL;

  if (!origin || origin !== baseUrl) {
    return new Response('Origem inválida', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
  const sessionId = cookies['Host-session'];

  if (sessionId) {
    const encoder = new TextEncoder();
    const digestSession = await crypto.subtle.digest('SHA-256', encoder.encode(sessionId));
    const sessionIdHash = btoa(String.fromCharCode(...new Uint8Array(digestSession)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const db = context.env.DB;
    await db.prepare(`DELETE FROM sessions WHERE id_hash = ?`).bind(sessionIdHash).run();
  }

  return new Response(null, {
    status: 302,
    headers: {
      'Location': baseUrl,
      'Cache-Control': 'no-store',
      'Set-Cookie': `Host-session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
    }
  });
}

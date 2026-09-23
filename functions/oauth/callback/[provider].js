export async function onRequestGet(context) {
  const providerName = context.params.provider;
  if (providerName !== 'google' && providerName !== 'github') {
    return new Response('Not found', { status: 404 });
  }

  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error || !code || !state) {
    return new Response('Parâmetros inválidos ou erro no provedor', { status: 400 });
  }

  // Leitura robusta do cookie (ignora espaços extras)
  const cookieHeader = context.request.headers.get('Cookie') || '';
  const cookies = Object.fromEntries(cookieHeader.split(';').filter(c => c).map(c => c.trim().split('=')));
  const txId = cookies['Host-oauth-tx'];

  if (!txId) {
    return new Response('Cookie de transação ausente', { status: 400 });
  }

  const db = context.env.DB;
  const encoder = new TextEncoder();

  // Calcular resumos para busca no D1
  const digestTx = await crypto.subtle.digest('SHA-256', encoder.encode(txId));
  const txIdHash = btoa(String.fromCharCode(...new Uint8Array(digestTx)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const digestState = await crypto.subtle.digest('SHA-256', encoder.encode(state));
  const stateHash = btoa(String.fromCharCode(...new Uint8Array(digestState)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Buscar transação no banco
  const tx = await db.prepare(
    `SELECT * FROM oauth_transactions WHERE id_hash = ? AND provider = ?`
  ).bind(txIdHash, providerName).first();

  // Apagar transação imediatamente (evitar reutilização)
  await db.prepare(`DELETE FROM oauth_transactions WHERE id_hash = ?`).bind(txIdHash).run();

  if (!tx || tx.expires_at < Math.floor(Date.now() / 1000) || tx.state_hash !== stateHash) {
    return new Response('Transação expirada ou state inválido', { status: 400 });
  }

  const baseUrl = context.env.PUBLIC_BASE_URL;
  const redirectUri = `${baseUrl}/oauth/callback/${providerName}`;
  let issuer = '';
  let subject = '';
  let email = null;
  let displayName = '';

  if (providerName === 'google') {
    // Trocar código por tokens no Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: context.env.GOOGLE_CLIENT_ID,
        client_secret: context.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: tx.code_verifier
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.id_token) {
      return new Response('Falha na troca de tokens do Google', { status: 400 });
    }

    // Validação básica e decodificação do JWT (id_token) do Google
    const parts = tokenData.id_token.split('.');
    if (parts.length !== 3) return new Response('JWT inválido', { status: 400 });
    
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
      return new Response('Emissor inválido', { status: 400 });
    }
    if (payload.aud !== context.env.GOOGLE_CLIENT_ID) {
      return new Response('Audiência inválida', { status: 400 });
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return new Response('Token expirado', { status: 400 });
    }
    if (tx.nonce && payload.nonce !== tx.nonce) {
      return new Response('Nonce inválido', { status: 400 });
    }

    issuer = 'https://accounts.google.com';
    subject = payload.sub;
    email = payload.email || null;
    displayName = payload.name || payload.email;

  } else {
    // Trocar código por tokens no GitHub
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: context.env.GITHUB_CLIENT_ID,
        client_secret: context.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
        code_verifier: tx.code_verifier
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return new Response('Falha na troca de tokens do GitHub', { status: 400 });
    }

    const accessToken = tokenData.access_token;

    // Consultar o perfil do usuário no GitHub
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Cloudflare-Pages-Lab'
      }
    });

    if (!userRes.ok) return new Response('Falha ao consultar perfil do GitHub', { status: 400 });
    const userData = await userRes.json();

    issuer = 'https://github.com';
    subject = String(userData.id);
    displayName = userData.name || userData.login;
    email = userData.email || null;

    // Revogar imediatamente o token de acesso da OAuth App
    const basicAuth = btoa(`${context.env.GITHUB_CLIENT_ID}:${context.env.GITHUB_CLIENT_SECRET}`);
    await fetch(`https://api.github.com/applications/${context.env.GITHUB_CLIENT_ID}/grant`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'Cloudflare-Pages-Lab'
      },
      body: JSON.stringify({ access_token: accessToken })
    });
  }

  // Função auxiliar para gerar valores aleatórios
  const generateRandomBase64URL = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  // Criar sessão opaca local no D1
  const sessionId = generateRandomBase64URL();
  const digestSession = await crypto.subtle.digest('SHA-256', encoder.encode(sessionId));
  const sessionIdHash = btoa(String.fromCharCode(...new Uint8Array(digestSession)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const now = Math.floor(Date.now() / 1000);
  const sessionExpiresAt = now + 28800; // 8 horas

  await db.prepare(
    `INSERT INTO sessions (id_hash, issuer, subject, email, display_name, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(sessionIdHash, issuer, subject, email, displayName, sessionExpiresAt, now).run();

  // Configuração correta de Headers para enviar múltiplos cookies
  const headers = new Headers();
  headers.set('Location', baseUrl);
  headers.append('Set-Cookie', `Host-oauth-tx=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  headers.append('Set-Cookie', `Host-session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`);

  return new Response(null, {
    status: 302,
    headers: headers
  });
}

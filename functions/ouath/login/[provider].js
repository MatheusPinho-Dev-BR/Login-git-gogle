export async function onRequestGet(context) {
  const providerName = context.params.provider;
  if (providerName !== 'google' && providerName !== 'github') {
    return new Response('Not found', { status: 404 });
  }

  const db = context.env.DB;
  const baseUrl = context.env.PUBLIC_BASE_URL;

  // Função auxiliar para gerar valores aleatórios
  const generateRandomBase64URL = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  const txId = generateRandomBase64URL();
  const state = generateRandomBase64URL();
  const codeVerifier = generateRandomBase64URL();
  const nonce = providerName === 'google' ? generateRandomBase64URL() : null;

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

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

  const expiresAt = Math.floor(Date.now() / 1000) + 600;

  await db.prepare(
    `INSERT INTO oauth_transactions (id_hash, provider, state_hash, nonce, code_verifier, expires_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(txIdHash, providerName, stateHash, nonce, codeVerifier, expiresAt).run();

  let authUrl = '';
  const clientId = providerName === 'google' ? context.env.GOOGLE_CLIENT_ID : context.env.GITHUB_CLIENT_ID;
  const redirectUri = `${baseUrl}/oauth/callback/${providerName}`;

  if (providerName === 'google') {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      nonce: nonce
    });
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  } else {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });
    authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  return new Response(null, {
    status: 302,
    headers: {
      'Location': authUrl,
      'Set-Cookie': `Host-oauth-tx=${txId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
    }
  });
}

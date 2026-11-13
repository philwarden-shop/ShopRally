// Sign-in with the Cognito hosted page (code flow + PKCE), then a signed session cookie.
import crypto from 'node:crypto';

const REGION = process.env.AWS_REGION || 'us-east-2';
const POOL = process.env.USER_POOL_ID;
const DOMAIN = process.env.COGNITO_DOMAIN;
const SESSION_HOURS = 10;

let cached = {};

export async function sessionKey() {
  if (globalThis.__SMX_TEST_KEY) return globalThis.__SMX_TEST_KEY;
  if (cached.key) return cached.key;
  const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
  const sm = new SecretsManagerClient({});
  const out = await sm.send(new GetSecretValueCommand({ SecretId: process.env.SECRET_ARN }));
  cached.key = JSON.parse(out.SecretString).sessionKey;
  return cached.key;
}

export async function clientId() {
  if (cached.clientId) return cached.clientId;
  const { CognitoIdentityProviderClient, ListUserPoolClientsCommand } = await import('@aws-sdk/client-cognito-identity-provider');
  const c = new CognitoIdentityProviderClient({});
  const out = await c.send(new ListUserPoolClientsCommand({ UserPoolId: POOL, MaxResults: 20 }));
  const hit = (out.UserPoolClients || []).find((x) => x.ClientName === process.env.CLIENT_NAME);
  if (!hit) throw new Error('web client not found');
  cached.clientId = hit.ClientId;
  return cached.clientId;
}

const b64u = (buf) => Buffer.from(buf).toString('base64url');

export function sign(obj, key) {
  const body = b64u(JSON.stringify(obj));
  const mac = crypto.createHmac('sha256', key).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function verify(token, key, now = Date.now()) {
  if (!token || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const want = crypto.createHmac('sha256', key).update(body).digest('base64url');
  const a = Buffer.from(mac || ''), b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let obj;
  try { obj = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
  if (!obj.exp || obj.exp < now) return null;
  return obj;
}

export function allowed(email) {
  const list = String(process.env.ALLOWED_EMAILS || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
  return list.includes(String(email || '').toLowerCase());
}

export async function loginRedirect(base, key) {
  const verifier = b64u(crypto.randomBytes(32));
  const challenge = b64u(crypto.createHash('sha256').update(verifier).digest());
  const state = b64u(crypto.randomBytes(16));
  const id = await clientId();
  const url = `https://${DOMAIN}/oauth2/authorize?` + new URLSearchParams({
    response_type: 'code', client_id: id, redirect_uri: `${base}auth/callback`,
    scope: 'openid email profile', state, code_challenge: challenge, code_challenge_method: 'S256',
  });
  const pending = sign({ state, verifier, exp: Date.now() + 10 * 60 * 1000 }, key);
  return { url, cookie: cookie('smx_login', pending, 600) };
}

export async function finishLogin({ base, code, state, pendingCookie, key }) {
  const pending = verify(pendingCookie, key);
  if (!pending || pending.state !== state) throw new Error('sign-in expired, please try again');
  const id = await clientId();
  const res = await fetch(`https://${DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', client_id: id, code, redirect_uri: `${base}auth/callback`, code_verifier: pending.verifier }),
  });
  if (!res.ok) throw new Error('sign-in could not be completed');
  const tok = await res.json();
  const claims = await verifyIdToken(tok.id_token, id);
  if (!allowed(claims.email)) throw new Error('this account does not have access to the test copy');
  const session = sign({ email: claims.email, name: claims.name || claims.email, exp: Date.now() + SESSION_HOURS * 3600 * 1000 }, key);
  return { cookie: cookie('smx_session', session, SESSION_HOURS * 3600), email: claims.email };
}

async function jwks() {
  if (cached.jwks && cached.jwksAt > Date.now() - 3600_000) return cached.jwks;
  const r = await fetch(`https://cognito-idp.${REGION}.amazonaws.com/${POOL}/.well-known/jwks.json`);
  cached.jwks = (await r.json()).keys;
  cached.jwksAt = Date.now();
  return cached.jwks;
}

export async function verifyIdToken(jwt, aud, { keys, now = Date.now() } = {}) {
  const [h, p, s] = String(jwt).split('.');
  const header = JSON.parse(Buffer.from(h, 'base64url').toString());
  const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
  const jwk = (keys || await jwks()).find((k) => k.kid === header.kid);
  if (!jwk || header.alg !== 'RS256') throw new Error('bad token key');
  const ok = crypto.verify('RSA-SHA256', Buffer.from(`${h}.${p}`), crypto.createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(s, 'base64url'));
  if (!ok) throw new Error('bad token signature');
  if (claims.iss !== `https://cognito-idp.${REGION}.amazonaws.com/${POOL}`) throw new Error('bad token issuer');
  if (claims.aud !== aud || claims.token_use !== 'id') throw new Error('bad token audience');
  if (claims.exp * 1000 < now) throw new Error('token expired');
  return claims;
}

export function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function logoutUrl(base) {
  return `https://${DOMAIN}/logout?` + new URLSearchParams({ client_id: cached.clientId || '', logout_uri: `${base}signed-out` });
}

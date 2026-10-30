const ACCESS_EMAIL = "cmigroupuganda@gmail.com";
const KEY_CACHE_TTL = 5 * 60 * 1000;

let cachedKeys;
let cachedKeysUntil = 0;
let cachedIssuer;

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJsonPart(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

function getAccessToken(request) {
  const authorization = request.headers.get("Authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7);

  const cookie = request.headers.get("Cookie") || "";
  const accessCookie = cookie.split(";").map((part) => part.trim())
    .find((part) => part.startsWith("CF_Authorization="));
  return accessCookie ? decodeURIComponent(accessCookie.slice("CF_Authorization=".length)) : "";
}

async function getAccessKeys(issuer) {
  if (cachedKeys && cachedIssuer === issuer && Date.now() < cachedKeysUntil) return cachedKeys;

  const response = await fetch(`${issuer}/cdn-cgi/access/certs`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Could not load Cloudflare Access signing keys (${response.status}).`);

  const keySet = await response.json();
  if (!Array.isArray(keySet.keys) || keySet.keys.length === 0) {
    throw new Error("Cloudflare Access returned no signing keys.");
  }
  cachedKeys = keySet.keys;
  cachedIssuer = issuer;
  cachedKeysUntil = Date.now() + KEY_CACHE_TTL;
  return cachedKeys;
}

export async function getVerifiedAccessEmail(request, env, audienceVariable = "CF_ACCESS_AUD") {
  const teamDomain = String(env.CF_ACCESS_TEAM_DOMAIN || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const audience = String(env[audienceVariable] || "").trim();
  if (!teamDomain || !audience) {
    console.error(`Cloudflare Access is not configured for ${audienceVariable}.`);
    return null;
  }

  try {
    const token = getAccessToken(request);
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = decodeJsonPart(encodedHeader);
    const payload = decodeJsonPart(encodedPayload);
    const issuer = `https://${teamDomain}`;
    if (header.alg !== "RS256" || typeof header.kid !== "string") return false;
    if (payload.iss !== issuer || !Number.isFinite(payload.exp) || payload.exp <= Date.now() / 1000) return false;
    if (Number.isFinite(payload.nbf) && payload.nbf > Date.now() / 1000) return false;

    const tokenAudiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!tokenAudiences.includes(audience)) return false;

    const keys = await getAccessKeys(issuer);
    const signingKey = keys.find((key) => key.kid === header.kid && key.kty === "RSA");
    if (!signingKey) return false;

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      signingKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signatureIsValid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
    if (!signatureIsValid) return false;

    const email = String(payload.email || "").toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  } catch (error) {
    console.error(`Could not verify Cloudflare Access identity for ${audienceVariable}.`, error);
    return null;
  }
}

export async function isAuthorizedReviewAdmin(request, env, audienceVariable = "CF_ACCESS_AUD") {
  const email = await getVerifiedAccessEmail(request, env, audienceVariable);
  return email === ACCESS_EMAIL;
}

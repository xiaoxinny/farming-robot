/**
 * OIDC / PKCE helpers for Cognito authorization code flow.
 */

/** Base64url-encode a Uint8Array (no padding). */
function base64urlEncode(bytes: Uint8Array): string {
  const binStr = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binStr).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generate a cryptographically random PKCE code_verifier.
 * Returns a 128-character base64url-encoded string.
 */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(96);
  crypto.getRandomValues(bytes);
  return base64urlEncode(bytes);
}

/**
 * Compute the PKCE code_challenge from a code_verifier.
 * SHA-256 hash, base64url-encoded (no padding).
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64urlEncode(new Uint8Array(digest));
}

/**
 * Generate a cryptographically random state parameter (32 bytes, base64url-encoded).
 */
export function generateState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64urlEncode(bytes);
}

/**
 * Build the Cognito authorize URL with all required OIDC parameters.
 */
export function buildAuthorizeUrl(codeChallenge: string, state: string): string {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN;
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_COGNITO_REDIRECT_URI;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid email profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `https://${domain}/oauth2/authorize?${params.toString()}`;
}

/**
 * Build the Cognito logout URL.
 */
export function buildLogoutUrl(): string {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN;
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const logoutUri = import.meta.env.VITE_COGNITO_REDIRECT_URI ?? window.location.origin;

  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: logoutUri,
  });

  return `https://${domain}/logout?${params.toString()}`;
}

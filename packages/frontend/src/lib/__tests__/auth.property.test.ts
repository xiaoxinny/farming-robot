import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Property 1: Authorize URL contains all required OIDC parameters
 *
 * For any valid configuration (COGNITO_DOMAIN, COGNITO_CLIENT_ID,
 * COGNITO_REDIRECT_URI) and any PKCE code_challenge and state string,
 * the constructed authorization URL must contain response_type=code,
 * the code_challenge with code_challenge_method=S256, the state parameter,
 * scope containing openid/email/profile, the redirect_uri matching the
 * configured value, and the client_id.
 *
 * **Validates: Requirements 1.2, 1.3, 1.4, 9.2, 9.3**
 */
describe("Property 1: Authorize URL contains all required OIDC parameters", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  /** Arbitrary for a non-empty alphanumeric string (safe for URL components). */
  const urlSafeStr = fc
    .string({ minLength: 1, maxLength: 64, unit: "grapheme" })
    .map((s) => s.replace(/[^a-zA-Z0-9]/g, "x"))
    .filter((s) => s.length > 0);

  /** Arbitrary for a domain-like string. */
  const domainArb = fc
    .tuple(urlSafeStr, urlSafeStr)
    .map(([prefix, suffix]) => `${prefix}.auth.${suffix}.amazoncognito.com`);

  /** Arbitrary for a redirect URI. */
  const redirectUriArb = urlSafeStr.map(
    (path) => `https://example.com/${path}/callback`,
  );

  it("URL contains all required OIDC parameters for any valid config", async () => {
    await fc.assert(
      fc.asyncProperty(
        domainArb,
        urlSafeStr,
        redirectUriArb,
        urlSafeStr,
        urlSafeStr,
        async (domain, clientId, redirectUri, codeChallenge, state) => {
          vi.stubEnv("VITE_COGNITO_DOMAIN", domain);
          vi.stubEnv("VITE_COGNITO_CLIENT_ID", clientId);
          vi.stubEnv("VITE_COGNITO_REDIRECT_URI", redirectUri);

          const { buildAuthorizeUrl } = await import("@/lib/auth");

          const url = buildAuthorizeUrl(codeChallenge, state);
          const parsed = new URL(url);
          const params = parsed.searchParams;

          // Base URL uses the configured domain (URL constructor lowercases hostname per spec)
          expect(parsed.host).toBe(domain.toLowerCase());
          expect(parsed.pathname).toBe("/oauth2/authorize");
          expect(parsed.protocol).toBe("https:");

          // All required OIDC parameters are present with correct values
          expect(params.get("response_type")).toBe("code");
          expect(params.get("client_id")).toBe(clientId);
          expect(params.get("redirect_uri")).toBe(redirectUri);
          expect(params.get("code_challenge")).toBe(codeChallenge);
          expect(params.get("code_challenge_method")).toBe("S256");
          expect(params.get("state")).toBe(state);

          // Scope contains all three required values
          const scope = params.get("scope") ?? "";
          expect(scope).toContain("openid");
          expect(scope).toContain("email");
          expect(scope).toContain("profile");

          vi.unstubAllEnvs();
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 2: PKCE code_challenge is the SHA-256 base64url encoding of the code_verifier
 *
 * For any randomly generated code_verifier string, the computed code_challenge
 * must equal the base64url-encoded SHA-256 hash of the code_verifier (with no
 * padding). This is a round-trip property: base64url(sha256(verifier)) must be
 * deterministic and correct.
 *
 * **Validates: Requirements 1.2**
 */
describe("Property 2: PKCE code_challenge is the SHA-256 base64url encoding of the code_verifier", () => {
  /** Helper: independently compute base64url(SHA-256(input)) using Web Crypto. */
  async function expectedChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(digest);
    const binStr = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
    return btoa(binStr).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  it("code_challenge matches independent SHA-256 base64url computation for any verifier", async () => {
    const { generateCodeChallenge } = await import("@/lib/auth");

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 256 }),
        async (verifier) => {
          const challenge = await generateCodeChallenge(verifier);
          const expected = await expectedChallenge(verifier);
          expect(challenge).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("code_challenge is deterministic — same verifier always produces same challenge", async () => {
    const { generateCodeChallenge } = await import("@/lib/auth");

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 128 }),
        async (verifier) => {
          const first = await generateCodeChallenge(verifier);
          const second = await generateCodeChallenge(verifier);
          expect(first).toBe(second);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("code_challenge contains no base64 padding characters", async () => {
    const { generateCodeChallenge } = await import("@/lib/auth");

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 128 }),
        async (verifier) => {
          const challenge = await generateCodeChallenge(verifier);
          expect(challenge).not.toContain("=");
          expect(challenge).not.toContain("+");
          expect(challenge).not.toContain("/");
        },
      ),
      { numRuns: 100 },
    );
  });
});

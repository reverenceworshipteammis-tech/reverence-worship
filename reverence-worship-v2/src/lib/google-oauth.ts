import { randomBytes } from "crypto";
import { jwtVerify, createRemoteJWKSet } from "jose";

export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

type GoogleTokenResponse = {
  id_token?: string;
  error?: string;
  error_description?: string;
};

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
};

export function googleOAuthConfig(origin: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Google sign-in is not configured.");
  }

  return { clientId, clientSecret, redirectUri };
}

export function createGoogleOAuthState() {
  return randomBytes(32).toString("hex");
}

export function googleAuthorizationUrl(origin: string, state: string) {
  const { clientId, redirectUri } = googleOAuthConfig(origin);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url;
}

export async function exchangeGoogleCode(origin: string, code: string) {
  const { clientId, clientSecret, redirectUri } = googleOAuthConfig(origin);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const token = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !token.id_token) {
    throw new Error(token.error_description || token.error || "Google sign-in failed.");
  }

  return verifyGoogleIdToken(token.id_token, clientId);
}

async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleProfile> {
  const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
  const { payload } = await jwtVerify(idToken, jwks, {
    audience: clientId,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  });

  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const name = typeof payload.name === "string" ? payload.name : email;
  const picture = typeof payload.picture === "string" ? payload.picture : null;
  const emailVerified = payload.email_verified === true;

  if (!sub || !email || !emailVerified) {
    throw new Error("Google account email could not be verified.");
  }

  return { sub, email, emailVerified, name, picture };
}

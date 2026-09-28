import { createAdminClient } from "@/lib/supabase/admin";

export const GOOGLE_STUDY_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
];

function requireGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google integration is not configured.");
  return { clientId, clientSecret };
}

export function googleRedirectUri(origin?: string) {
  return process.env.GOOGLE_REDIRECT_URI || (origin ? `${origin}/api/google/callback` : "");
}

export function buildGoogleAuthorizationUrl(origin: string, state: string) {
  const { clientId } = requireGoogleConfig();
  const redirectUri = googleRedirectUri(origin);
  if (!redirectUri) throw new Error("Missing GOOGLE_REDIRECT_URI.");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: GOOGLE_STUDY_SCOPES.join(" "),
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string, origin: string) {
  const { clientId, clientSecret } = requireGoogleConfig();
  const redirectUri = googleRedirectUri(origin);
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
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || "Google token exchange failed.");
  return data as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
}

async function refreshGoogleToken(refreshToken: string) {
  const { clientId, clientSecret } = requireGoogleConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || "Google token refresh failed.");
  return data as { access_token: string; expires_in?: number; scope?: string };
}

export async function getGoogleIntegration(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("google_integrations")
    .select("user_id,access_token,refresh_token,expires_at,scopes,connected_email,calendar_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getGoogleAccessToken(userId: string) {
  const integration = await getGoogleIntegration(userId);
  if (!integration) throw new Error("Google nie jest podłączony.");

  const expiresAt = integration.expires_at ? new Date(integration.expires_at).getTime() : 0;
  if (integration.access_token && expiresAt > Date.now() + 60_000) return integration.access_token;
  if (!integration.refresh_token) throw new Error("Brak refresh tokenu Google. Podłącz konto ponownie.");

  const refreshed = await refreshGoogleToken(integration.refresh_token);
  const nextExpiry = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString();
  const admin = createAdminClient();
  const { error } = await admin.from("google_integrations").update({
    access_token: refreshed.access_token,
    expires_at: nextExpiry,
    scopes: refreshed.scope ? refreshed.scope.split(" ") : integration.scopes,
  }).eq("user_id", userId);

  if (error) throw new Error(error.message);
  return refreshed.access_token;
}

export async function googleApiFetch(userId: string, url: string, init?: RequestInit) {
  const token = await getGoogleAccessToken(userId);
  const headers = new Headers(init?.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json");

  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google API ${response.status}: ${body.slice(0, 300)}`);
  }
  return response;
}

import { createHmac, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type UsosProvider = "ujd" | "pcz";

type ProviderConfig = {
  id: UsosProvider;
  name: string;
  shortName: string;
  baseUrl: string;
  consumerKey?: string;
  consumerSecret?: string;
};

const PROVIDERS: Record<UsosProvider, ProviderConfig> = {
  ujd: {
    id: "ujd",
    name: "Uniwersytet Jana Długosza w Częstochowie",
    shortName: "UJD",
    baseUrl: "https://usosapps.ujd.edu.pl",
    consumerKey: process.env.USOS_UJD_CONSUMER_KEY,
    consumerSecret: process.env.USOS_UJD_CONSUMER_SECRET,
  },
  pcz: {
    id: "pcz",
    name: "Politechnika Częstochowska",
    shortName: "PCz",
    baseUrl: "https://usosapi.pcz.pl",
    consumerKey: process.env.USOS_PCZ_CONSUMER_KEY,
    consumerSecret: process.env.USOS_PCZ_CONSUMER_SECRET,
  },
};

function encode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, char =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function nonce() {
  return randomBytes(18).toString("hex");
}

function providerConfig(provider: UsosProvider, requireCredentials = true) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error("Nieobsługiwana uczelnia.");
  if (requireCredentials && (!config.consumerKey || !config.consumerSecret)) {
    throw new Error(`Integracja ${config.shortName} nie jest jeszcze skonfigurowana.`);
  }
  return config;
}

function normalizedParams(url: URL, oauth: Record<string, string>) {
  const pairs: Array<[string, string]> = [];
  url.searchParams.forEach((value, key) => pairs.push([encode(key), encode(value)]));
  Object.entries(oauth)
    .filter(([key]) => key !== "oauth_signature")
    .forEach(([key, value]) => pairs.push([encode(key), encode(value)]));
  pairs.sort((a, b) => a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0]));
  return pairs.map(([key, value]) => `${key}=${value}`).join("&");
}

function oauthHeader(params: Record<string, string>) {
  const value = Object.entries(params)
    .filter(([key]) => key.startsWith("oauth_"))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${encode(key)}="${encode(val)}"`)
    .join(", ");
  return `OAuth ${value}`;
}

function signedRequestOptions({
  provider,
  method,
  url,
  token,
  tokenSecret,
  oauthExtra,
}: {
  provider: UsosProvider;
  method: "GET" | "POST";
  url: URL;
  token?: string;
  tokenSecret?: string;
  oauthExtra?: Record<string, string>;
}) {
  const config = providerConfig(provider);
  const oauth: Record<string, string> = {
    oauth_consumer_key: config.consumerKey!,
    oauth_nonce: nonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
    ...(token ? { oauth_token: token } : {}),
    ...(oauthExtra || {}),
  };

  const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
  const signatureBase = [
    method,
    encode(baseUrl),
    encode(normalizedParams(url, oauth)),
  ].join("&");
  const signingKey = `${encode(config.consumerSecret!)}&${encode(tokenSecret || "")}`;
  oauth.oauth_signature = createHmac("sha1", signingKey).update(signatureBase).digest("base64");

  return {
    method,
    headers: {
      Authorization: oauthHeader(oauth),
      Accept: "application/json",
    },
    cache: "no-store" as const,
  };
}

async function signedFetch(
  provider: UsosProvider,
  path: string,
  {
    method = "GET",
    query = {},
    token,
    tokenSecret,
    oauthExtra,
  }: {
    method?: "GET" | "POST";
    query?: Record<string, string | number | boolean | null | undefined>;
    token?: string;
    tokenSecret?: string;
    oauthExtra?: Record<string, string>;
  } = {}
) {
  const config = providerConfig(provider);
  const url = new URL(path, config.baseUrl);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
  });

  const response = await fetch(
    url,
    signedRequestOptions({ provider, method, url, token, tokenSecret, oauthExtra })
  );
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`USOS ${config.shortName} ${response.status}: ${body.slice(0, 500)}`);
  }
  return body;
}

export function usosProviderList() {
  return (Object.keys(PROVIDERS) as UsosProvider[]).map(provider => {
    const config = providerConfig(provider, false);
    return {
      id: provider,
      name: config.name,
      shortName: config.shortName,
      baseUrl: config.baseUrl,
      configured: Boolean(config.consumerKey && config.consumerSecret),
    };
  });
}

export function isUsosProvider(value: string | null): value is UsosProvider {
  return value === "ujd" || value === "pcz";
}

export function usosProviderName(provider: UsosProvider) {
  return providerConfig(provider, false).name;
}

export function usosCallbackUrl(origin: string) {
  return process.env.USOS_CALLBACK_URL || `${origin}/api/usos/callback`;
}

export async function createUsosRequestToken(provider: UsosProvider, callbackUrl: string) {
  const body = await signedFetch(provider, "/services/oauth/request_token", {
    method: "POST",
    query: { scopes: "studies|offline_access" },
    oauthExtra: { oauth_callback: callbackUrl },
  });
  const params = new URLSearchParams(body);
  const token = params.get("oauth_token");
  const secret = params.get("oauth_token_secret");
  if (!token || !secret) throw new Error("USOS nie zwrócił Request Tokenu.");
  return { token, secret };
}

export function usosAuthorizeUrl(provider: UsosProvider, requestToken: string) {
  const config = providerConfig(provider, false);
  const url = new URL("/services/oauth/authorize", config.baseUrl);
  url.searchParams.set("oauth_token", requestToken);
  url.searchParams.set("interactivity", "minimal");
  return url.toString();
}

export async function exchangeUsosAccessToken(
  provider: UsosProvider,
  requestToken: string,
  requestTokenSecret: string,
  verifier: string
) {
  const body = await signedFetch(provider, "/services/oauth/access_token", {
    method: "POST",
    token: requestToken,
    tokenSecret: requestTokenSecret,
    oauthExtra: { oauth_verifier: verifier },
  });
  const params = new URLSearchParams(body);
  const token = params.get("oauth_token");
  const secret = params.get("oauth_token_secret");
  if (!token || !secret) throw new Error("USOS nie zwrócił Access Tokenu.");
  return { token, secret };
}

export async function usosGetJson<T = any>(
  provider: UsosProvider,
  path: string,
  token: string,
  tokenSecret: string,
  query: Record<string, string | number | boolean | null | undefined> = {}
): Promise<T> {
  const body = await signedFetch(provider, path, {
    method: "GET",
    token,
    tokenSecret,
    query,
  });
  return JSON.parse(body) as T;
}

export async function getUsosConnection(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("usos_connections")
    .select("user_id,provider,scopes,external_user_id,external_user_name,connected_at,last_sync_at,last_sync_status,last_sync_summary")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as any;
}

export async function getUsosConnectionWithSecrets(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("usos_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as any;
}

export function sealUsosOauthState(payload: {
  provider: UsosProvider;
  requestToken: string;
  requestTokenSecret: string;
  userId: string;
  expiresAt: number;
}) {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const secret = providerConfig(payload.provider).consumerSecret!;
  const signature = createHmac("sha256", secret).update(json).digest("base64url");
  return `${json}.${signature}`;
}

export function unsealUsosOauthState(value: string | undefined) {
  if (!value) return null;
  const [json, signature] = value.split(".");
  if (!json || !signature) return null;

  let payload: {
    provider: UsosProvider;
    requestToken: string;
    requestTokenSecret: string;
    userId: string;
    expiresAt: number;
  };
  try {
    payload = JSON.parse(Buffer.from(json, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!isUsosProvider(payload.provider) || payload.expiresAt < Date.now()) return null;

  const secret = providerConfig(payload.provider).consumerSecret!;
  const expected = createHmac("sha256", secret).update(json).digest("base64url");
  if (signature.length !== expected.length) return null;

  let diff = 0;
  for (let i = 0; i < signature.length; i++) diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? payload : null;
}

export async function revokeUsosToken(
  provider: UsosProvider,
  token: string,
  tokenSecret: string
) {
  try {
    await signedFetch(provider, "/services/oauth/revoke_token", {
      method: "POST",
      token,
      tokenSecret,
      query: { deauthorize: "true" },
    });
  } catch {
    // Local disconnect must still succeed if provider revoke fails.
  }
}

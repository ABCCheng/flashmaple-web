import {
  EDGE_TTS_CLIENT_VERSION,
  EDGE_TTS_DEFAULT_TOKEN_TTL_MS,
  EDGE_TTS_ENDPOINT_URL,
  EDGE_TTS_HOME_REGION,
  EDGE_TTS_TOKEN_REFRESH_BEFORE_EXPIRY_MS,
  EDGE_TTS_USER_ID,
} from "./constants";
import { EdgeTTSError } from "./errors";
import { generateTranslatorSignature } from "./signature";

type Endpoint = { r: string; t: string };
let cached: { endpoint: Endpoint; expiredAt: number } | null = null;

function getAbortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The operation was aborted", "AbortError");
}

async function requestEndpointToken(now = new Date(), signal?: AbortSignal): Promise<Response> {
  if (signal?.aborted) throw getAbortReason(signal);

  return fetch(EDGE_TTS_ENDPOINT_URL, {
    method: "POST",
    headers: {
      "Accept-Language": "zh-Hans",
      "X-ClientVersion": EDGE_TTS_CLIENT_VERSION,
      "X-UserId": EDGE_TTS_USER_ID,
      "X-HomeGeographicRegion": EDGE_TTS_HOME_REGION,
      "X-ClientTraceId": crypto.randomUUID().replaceAll("-", ""),
      "X-MT-Signature": await generateTranslatorSignature(EDGE_TTS_ENDPOINT_URL, now),
      "Content-Type": "application/json; charset=utf-8",
    },
    body: "",
    cache: "no-store",
    referrerPolicy: "no-referrer",
    signal,
  });
}

function getServerDate(response: Response): Date | null {
  const value = response.headers.get("date");
  if (!value) return null;

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function tokenExpiry(token: string): number {
  try {
    const payload = token.split(".")[1];
    if (!payload) return Date.now() + EDGE_TTS_DEFAULT_TOKEN_TTL_MS;
    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const exp = (JSON.parse(atob(normalized)) as { exp?: number }).exp;
    return typeof exp === "number" ? exp * 1000 : Date.now() + EDGE_TTS_DEFAULT_TOKEN_TTL_MS;
  } catch {
    return Date.now() + EDGE_TTS_DEFAULT_TOKEN_TTL_MS;
  }
}

export async function getEdgeTTSEndpointToken(signal?: AbortSignal): Promise<{ endpoint: Endpoint; token: string }> {
  if (signal?.aborted) throw getAbortReason(signal);

  if (cached && Date.now() < cached.expiredAt - EDGE_TTS_TOKEN_REFRESH_BEFORE_EXPIRY_MS) {
    return { endpoint: cached.endpoint, token: cached.endpoint.t };
  }

  try {
    let response = await requestEndpointToken(new Date(), signal);
    if (response.status === 401) {
      response = await requestEndpointToken(getServerDate(response) ?? new Date(), signal);
    }
    if (!response.ok) {
      throw new EdgeTTSError("TOKEN_FETCH_FAILED", `Failed to fetch endpoint token: ${response.status}`, {
        status: response.status,
        retryable: response.status >= 500,
      });
    }

    const data = (await response.json()) as Partial<Endpoint>;
    if (typeof data.r !== "string" || typeof data.t !== "string") {
      throw new EdgeTTSError("TOKEN_FETCH_FAILED", "Endpoint response is missing token or region");
    }
    cached = { endpoint: { r: data.r, t: data.t }, expiredAt: tokenExpiry(data.t) };
    return { endpoint: cached.endpoint, token: data.t };
  } catch (error) {
    if (signal?.aborted) throw getAbortReason(signal);
    if (cached && Date.now() < cached.expiredAt) return { endpoint: cached.endpoint, token: cached.endpoint.t };
    if (error instanceof EdgeTTSError) throw error;
    throw new EdgeTTSError("TOKEN_FETCH_FAILED", "Failed to fetch Edge TTS endpoint token", { cause: error, retryable: true });
  }
}

export function clearEdgeTTSTokenCache(): void {
  cached = null;
}

import { API_ORIGIN, APP_ENV } from "@/lib/env";
import { defaultLocale, dictionaries, isLocale, type Locale } from "@/lib/i18n";
import { clearUserInfo } from "@/lib/stores/auth-user";
import { getDeviceName } from "@/lib/device";
import { getStoredRegion } from "@/lib/stores/region";
import { showGlobalSnackbar } from "@/components/providers/snackbar-provider";
import type { ApiResponse } from "./types";

type RequestOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined | null>;
  silent?: boolean;
};

// Carries HTTP or application status codes.
class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let refreshPromise: Promise<boolean> | null = null;
let deviceReadyPromise: Promise<ApiResponse<void>> | null = null;
let deviceReadyResponse: ApiResponse<void> | null = null;

function currentLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const lang = document.documentElement.lang;
  return isLocale(lang) ? lang : defaultLocale;
}

function buildUrl(path: string, params?: RequestOptions["params"]) {
  const useDevProxy = APP_ENV === "development" && typeof window !== "undefined";
  const base = useDevProxy ? window.location.origin : API_ORIGIN || "http://localhost";
  const url = new URL(path, base);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function isDeviceActivationPath(path: string) {
  return path === "/api/user/activate-device";
}

export function ensureDeviceReady() {
  if (deviceReadyResponse) return Promise.resolve(deviceReadyResponse);
  if (deviceReadyPromise) return deviceReadyPromise;

  deviceReadyPromise = (async () => {
    const deviceName = await getDeviceName();
    const res = await fetch(buildUrl("/api/user/activate-device"), {
      method: "POST",
      credentials: "include",
      headers: {
        "X-App-Name": "flashmaple",
        "X-Device-Name": deviceName,
        "X-Language": currentLocale(),
        "X-Region": getStoredRegion(),
      },
    });

    const payload = await parsePayload<ApiResponse<void>>(res).catch(() => null);
    if (!res.ok || !payload || payload.code !== 200) {
      throw new ApiError(getResponseMessage(payload) || "Device initialization failed", res.status || 400);
    }
    deviceReadyResponse = payload;
    return payload;
  })().finally(() => {
    deviceReadyPromise = null;
  });

  return deviceReadyPromise;
}

async function refreshSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const deviceName = await getDeviceName();

    const res = await fetch(buildUrl("/api/user/refresh-token"), {
      method: "POST",
      credentials: "include",
      headers: {
        "X-App-Name": "flashmaple",
        "X-Device-Name": deviceName,
        "X-Language": currentLocale(),
        "X-Region": getStoredRegion(),
      },
    });

    if (!res.ok) {
      const payload = await parsePayload<unknown>(res).catch(() => null);
      throw new ApiError(getResponseMessage(payload) || "Refresh token failed", res.status);
    }
    return true;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function parsePayload<T>(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();
  if (!body) return null as T;
  if (contentType.includes("application/json")) {
    return JSON.parse(body) as T;
  }
  return body as T;
}

function getResponseObject(payload: unknown) {
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
}

function getResponseMessage(payload: unknown) {
  const responseObject = getResponseObject(payload);
  if (typeof responseObject?.message === "string") {
    return responseObject.message;
  }

  const data = responseObject?.data;
  const dataObject = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  return typeof dataObject?.message === "string" ? dataObject.message : "";
}

async function rawRequest<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  if (!isDeviceActivationPath(path)) {
    await ensureDeviceReady();
  }

  const deviceName = await getDeviceName();
  const headers = new Headers(options.headers);

  headers.set("X-App-Name", "flashmaple");
  headers.set("X-Device-Name", deviceName);
  headers.set("X-Language", currentLocale());
  headers.set("X-Region", getStoredRegion());

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const requestUrl = buildUrl(path, options.params);
  
  let response: Response;
  try {
    response = await fetch(requestUrl, { ...options, headers, credentials: "include" });
  } catch {
    // Normalize network failures for callers.
    throw new ApiError("", 400); 
  }

  if (response.status === 401 && retry && !path.includes("/refresh-token")) {
    try {
      await refreshSession();
      return rawRequest<T>(path, options, false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearUserInfo();
      }
      throw error;
    }
  }

  const payload = await parsePayload<unknown>(response);

  // HTTP status is normalized by the backend response handler.
  if (!response.ok) {
    if (response.headers.get("X-Device-Required") === "1" && retry && !isDeviceActivationPath(path)) {
      deviceReadyResponse = null;
      await ensureDeviceReady();
      return rawRequest<T>(path, options, false);
    }

    const errorMsg = getResponseMessage(payload);
    throw new ApiError(errorMsg, response.status);
  }

  return payload as T;
}

export async function get<T>(path: string, params?: RequestOptions["params"], config?: RequestOptions) {
  try {
    return await rawRequest<T>(path, { ...(config ?? {}), params, method: "GET" });
  } catch (error) {
    if (!config?.silent) {
      showRequestError(error);
    }
    return null;
  }
}

export async function post<T>(path: string, data?: unknown, config?: RequestOptions) {
  try {
    const body = data instanceof FormData ? data : data === undefined ? undefined : JSON.stringify(data);
    return await rawRequest<T>(path, { ...(config ?? {}), body, method: "POST" });
  } catch (error) {
    if (!config?.silent) {
      showRequestError(error);
    }
    return null;
  }
}

/** Displays a localized API error message. */
function showRequestError(error: unknown) {
  if (error instanceof ApiError && error.message && error.message.trim() !== "") {
    showGlobalSnackbar(error.message);
    return;
  }

  const locale = currentLocale();
  
  const networkDict = dictionaries[locale].network;

  if (error instanceof ApiError && error.status) {
    if (error.status >= 500) {
      showGlobalSnackbar(networkDict.networkErrorServer || "Server Error");
      return;
    }
    showGlobalSnackbar(networkDict.networkErrorUser || "Client Error");
    return;
  }

  showGlobalSnackbar(networkDict.requestFailed || "Request Failed");
}

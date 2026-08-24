import { get, post } from "./client";
import type { ApiResponse } from "./types";

const WEB_PUSH_PREFIX = "/api/web-push";
const WEB_PUSH_APP_NAME = "flashmaple";

export interface WebPushConfig {
  publicKey: string | null;
  subscribed: boolean;
}

export interface WebPushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function getWebPushConfig(config?: { silent?: boolean }) {
  return get<ApiResponse<WebPushConfig>>(`${WEB_PUSH_PREFIX}/config`, { appName: WEB_PUSH_APP_NAME }, config);
}

export function subscribeWebPush(payload: WebPushSubscriptionPayload, config?: { silent?: boolean }) {
  return post<ApiResponse<void>>(`${WEB_PUSH_PREFIX}/subscribe`, {
    appName: WEB_PUSH_APP_NAME,
    ...payload,
  }, config);
}

export function unsubscribeWebPush() {
  return post<ApiResponse<void>>(`${WEB_PUSH_PREFIX}/unsubscribe`, {
    appName: WEB_PUSH_APP_NAME,
  });
}

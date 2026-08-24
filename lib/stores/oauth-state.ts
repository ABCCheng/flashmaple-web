import { isLocale, type Locale } from "@/lib/i18n";
import type { SocialAuthMode, SocialIdentityProvider } from "@/lib/env";

import { getSessionStorage } from "./storage";

export interface SocialAuthStatePayload {
  nonce: string;
  codeVerifier: string;
  locale: Locale;
  mode: SocialAuthMode;
  provider: SocialIdentityProvider;
}

interface StoredSocialAuthState extends SocialAuthStatePayload {
  createdAt: number;
}

const SOCIAL_AUTH_STATE_STORAGE_PREFIX = "FLASH_MAPLE_SOCIAL_AUTH_STATE:";
const SOCIAL_AUTH_STATE_TTL_MS = 10 * 60 * 1000;
const SOCIAL_AUTH_NONCE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PKCE_VERIFIER_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;

function socialAuthStateStorageKey(nonce: string) {
  return `${SOCIAL_AUTH_STATE_STORAGE_PREFIX}${nonce}`;
}

function isValidStoredSocialAuthState(
  value: unknown,
  expectedNonce: string,
  now: number
): value is StoredSocialAuthState {
  if (!value || typeof value !== "object") return false;

  const payload = value as Partial<StoredSocialAuthState>;
  return (
    payload.nonce === expectedNonce &&
    typeof payload.codeVerifier === "string" &&
    PKCE_VERIFIER_PATTERN.test(payload.codeVerifier) &&
    typeof payload.locale === "string" &&
    isLocale(payload.locale) &&
    (payload.mode === "DIRECT" || payload.mode === "FUSIONAUTH") &&
    payload.provider === "GOOGLE" &&
    typeof payload.createdAt === "number" &&
    Number.isFinite(payload.createdAt) &&
    payload.createdAt <= now &&
    now - payload.createdAt <= SOCIAL_AUTH_STATE_TTL_MS
  );
}

function pruneExpiredSocialAuthStates(storage: Storage, now: number) {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(SOCIAL_AUTH_STATE_STORAGE_PREFIX)) keys.push(key);
  }

  for (const key of keys) {
    const nonce = key.slice(SOCIAL_AUTH_STATE_STORAGE_PREFIX.length);
    const raw = storage.getItem(key);
    let value: unknown;

    try {
      value = raw ? JSON.parse(raw) : null;
    } catch {
      value = null;
    }

    if (!SOCIAL_AUTH_NONCE_PATTERN.test(nonce) || !isValidStoredSocialAuthState(value, nonce, now)) {
      storage.removeItem(key);
    }
  }
}

export function storeSocialAuthState(payload: StoredSocialAuthState) {
  const storage = getSessionStorage();
  if (!storage) throw new Error("Social sign-in requires session storage.");

  pruneExpiredSocialAuthStates(storage, payload.createdAt);
  storage.setItem(socialAuthStateStorageKey(payload.nonce), JSON.stringify(payload));
}

function readSocialAuthState(storage: Storage, state: string) {
  const raw = storage.getItem(socialAuthStateStorageKey(state));
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw) as unknown;
    if (!isValidStoredSocialAuthState(payload, state, Date.now())) return null;
    const { nonce, codeVerifier, locale, mode, provider } = payload;
    return { nonce, codeVerifier, locale, mode, provider } satisfies SocialAuthStatePayload;
  } catch {
    return null;
  }
}

export function consumeSocialAuthState(state: string | null) {
  if (!state || !SOCIAL_AUTH_NONCE_PATTERN.test(state)) return null;

  const storage = getSessionStorage();
  if (!storage) return null;

  const key = socialAuthStateStorageKey(state);
  try {
    const payload = readSocialAuthState(storage, state);
    storage.removeItem(key);
    return payload;
  } catch {
    return null;
  }
}

export function peekSocialAuthState(state: string | null) {
  if (!state || !SOCIAL_AUTH_NONCE_PATTERN.test(state)) return null;

  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    return readSocialAuthState(storage, state);
  } catch {
    return null;
  }
}

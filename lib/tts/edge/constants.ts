export const EDGE_TTS_DEFAULT_TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
export const EDGE_TTS_DEFAULT_SIGNATURE_SECRET_BASE64 =
  "oik6PdDdMnOXemTbwvMn9de/h9lFnfBaCWbGMMZqqoSaQaqUOqjVGm5NqsmjcBI1x+sS9ugjB55HEJWRiFXYFw==";

export const EDGE_TTS_ENDPOINT_URL =
  "https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0";
export const EDGE_TTS_OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
export const EDGE_TTS_MAX_CHUNK_BYTES = 1800;
export const EDGE_TTS_MAX_CHUNKS = 60;
export const EDGE_TTS_MAX_RETRIES = 2;
export const EDGE_TTS_RETRY_BASE_DELAY_MS = 500;
export const EDGE_TTS_TOKEN_REFRESH_BEFORE_EXPIRY_MS = 3 * 60 * 1000;
export const EDGE_TTS_DEFAULT_TOKEN_TTL_MS = 10 * 60 * 1000;
export const EDGE_TTS_CLIENT_VERSION = "4.0.530a 5fe1dc6c";
export const EDGE_TTS_USER_ID = "0f04d16a175c411e";
export const EDGE_TTS_HOME_REGION = "zh-Hans-CN";

// These values are public client credentials used by the first-party Edge TTS
// client. Keep them as plain constants so the browser bundle does not depend
// on server-only environment variable replacement.
export const EDGE_TTS_SIGNATURE_APP_ID = "MSTranslatorAndroidApp";

export function getEdgeTTSTrustedClientToken(): string {
  return EDGE_TTS_DEFAULT_TRUSTED_CLIENT_TOKEN;
}

export function getEdgeTTSSignatureSecretBase64(): string {
  return EDGE_TTS_DEFAULT_SIGNATURE_SECRET_BASE64;
}

export function getEdgeTTSVoicesUrl(): string {
  return `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=${getEdgeTTSTrustedClientToken()}`;
}

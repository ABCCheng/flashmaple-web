import {
  EDGE_TTS_DEFAULT_SIGNATURE_SECRET_BASE64,
  EDGE_TTS_ENDPOINT_URL,
  EDGE_TTS_SIGNATURE_APP_ID,
  getEdgeTTSSignatureSecretBase64,
} from "./constants";
import { EdgeTTSError } from "./errors";

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64 || EDGE_TTS_DEFAULT_SIGNATURE_SECRET_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function buildSignatureDate(date = new Date()): string {
  return `${date.toUTCString().replace("GMT", "").trim().toLowerCase()} GMT`;
}

export async function generateTranslatorSignature(
  url = EDGE_TTS_ENDPOINT_URL,
  now = new Date(),
): Promise<string> {
  try {
    const requestId = crypto.randomUUID().replaceAll("-", "");
    const payload = `${EDGE_TTS_SIGNATURE_APP_ID}${encodeURIComponent(url.split("://")[1] ?? "")}${buildSignatureDate(now)}${requestId}`.toLowerCase();
    const keyBytes = base64ToBytes(getEdgeTTSSignatureSecretBase64());
    const keyBuffer = new ArrayBuffer(keyBytes.byteLength);
    new Uint8Array(keyBuffer).set(keyBytes);
    const key = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    let binary = "";
    for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte);
    return `${EDGE_TTS_SIGNATURE_APP_ID}::${btoa(binary)}::${buildSignatureDate(now)}::${requestId}`;
  } catch (cause) {
    throw new EdgeTTSError("SIGNATURE_GENERATION_FAILED", "Failed to generate translator signature", { cause });
  }
}

import { EdgeTTSError } from "./errors";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildSSML(text: string, voice: string, rate: string, pitch: string, volume: string): string {
  const cleanText = Array.from(text)
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code <= 8 || (code >= 11 && code <= 12) || (code >= 14 && code <= 31) ? " " : char;
    })
    .join("")
    .trim();
  if (!cleanText) throw new EdgeTTSError("INVALID_TEXT", "Text to speech input is empty");
  const locale = voice.split("-").slice(0, 2).join("-") || "en-US";
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${escapeXml(locale)}"><voice name="${escapeXml(voice)}"><prosody rate="${escapeXml(rate)}" pitch="${escapeXml(pitch)}" volume="${escapeXml(volume)}">${escapeXml(cleanText)}</prosody></voice></speak>`;
}

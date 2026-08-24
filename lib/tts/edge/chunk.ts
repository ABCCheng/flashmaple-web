import { EDGE_TTS_MAX_CHUNK_BYTES, EDGE_TTS_MAX_CHUNKS } from "./constants";
import { EdgeTTSError } from "./errors";

export function splitTextByUtf8Bytes(text: string): string[] {
  const remainingText = text.trim();
  if (!remainingText) throw new EdgeTTSError("INVALID_TEXT", "Text to speech input is empty");
  const chunks: string[] = [];
  let remaining = remainingText;

  while (remaining) {
    let end = Math.min(remaining.length, EDGE_TTS_MAX_CHUNK_BYTES);
    while (end > 0 && new TextEncoder().encode(remaining.slice(0, end)).length > EDGE_TTS_MAX_CHUNK_BYTES) end -= 1;
    if (end <= 0) throw new EdgeTTSError("INVALID_TEXT", "Unable to split input text safely");
    if (end < remaining.length) {
      const boundary = Math.max(1, remaining.slice(0, end).search(/[.!?。！？；]\s*[^.!?。！？；]*$/) + 1);
      if (boundary > 1 && boundary > end * 0.6) end = boundary;
    }
    chunks.push(remaining.slice(0, end).trim());
    if (chunks.length > EDGE_TTS_MAX_CHUNKS) throw new EdgeTTSError("TEXT_TOO_LONG", "Text is too long for Edge TTS");
    remaining = remaining.slice(end).trim();
  }
  return chunks;
}

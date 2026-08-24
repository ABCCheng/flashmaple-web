import { EDGE_TTS_MAX_RETRIES, EDGE_TTS_OUTPUT_FORMAT, EDGE_TTS_RETRY_BASE_DELAY_MS } from "./constants";
import { clearEdgeTTSTokenCache, getEdgeTTSEndpointToken } from "./endpoint";
import { EdgeTTSError } from "./errors";
import { buildSSML } from "./ssml";
import { splitTextByUtf8Bytes } from "./chunk";

export async function synthesizeEdgeTTS(params: {
  text: string;
  voice: string;
  rate: string;
  pitch: string;
  volume: string;
  signal?: AbortSignal;
}): Promise<{ audio: ArrayBuffer; contentType: string }> {
  const signal = params.signal;
  const chunks = splitTextByUtf8Bytes(params.text);
  const buffers: ArrayBuffer[] = [];
  let contentType = "audio/mpeg";
  for (const chunk of chunks) {
    if (signal?.aborted) throw signal.reason ?? new DOMException("The operation was aborted", "AbortError");

    let lastError: unknown;
    for (let attempt = 0; attempt <= EDGE_TTS_MAX_RETRIES; attempt += 1) {
      try {
        const endpointInfo = await getEdgeTTSEndpointToken(signal);
        const response = await fetch(`https://${endpointInfo.endpoint.r}.tts.speech.microsoft.com/cognitiveservices/v1`, {
          method: "POST",
          headers: {
            Authorization: endpointInfo.token,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": EDGE_TTS_OUTPUT_FORMAT,
          },
          body: buildSSML(chunk, params.voice, params.rate, params.pitch, params.volume),
          cache: "no-store",
          referrerPolicy: "no-referrer",
          signal,
        });
        if (!response.ok) {
          const message = await response.text().catch(() => "");
          if (response.status === 401 || response.status === 403) {
            clearEdgeTTSTokenCache();
            throw new EdgeTTSError("TOKEN_INVALID", `Edge TTS token invalid: ${response.status} ${message}`, { retryable: true, status: response.status });
          }
          if (response.status === 429) throw new EdgeTTSError("SYNTH_RATE_LIMITED", `Edge TTS rate limited: ${message}`, { retryable: true, status: response.status });
          if (response.status >= 500) throw new EdgeTTSError("SYNTH_SERVER_ERROR", `Edge TTS server error: ${response.status} ${message}`, { retryable: true, status: response.status });
          throw new EdgeTTSError("SYNTH_REQUEST_FAILED", `Edge TTS request failed: ${response.status} ${message}`, { status: response.status });
        }
        buffers.push(await response.arrayBuffer());
        contentType = response.headers.get("content-type") || contentType;
        lastError = null;
        break;
      } catch (error) {
        if (signal?.aborted) throw signal.reason ?? error;
        lastError = error;
        const retryable = error instanceof EdgeTTSError ? error.retryable : error instanceof TypeError;
        if (!retryable || attempt >= EDGE_TTS_MAX_RETRIES) break;
        await new Promise((resolve) => setTimeout(resolve, EDGE_TTS_RETRY_BASE_DELAY_MS * (attempt + 1) + Math.floor(Math.random() * 200)));
      }
    }
    if (lastError) {
      if (lastError instanceof EdgeTTSError) throw lastError;
      throw new EdgeTTSError("NETWORK_ERROR", "Network error while requesting Edge TTS", { cause: lastError, retryable: true });
    }
  }
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
  const audio = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    audio.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  return { audio: audio.buffer, contentType };
}

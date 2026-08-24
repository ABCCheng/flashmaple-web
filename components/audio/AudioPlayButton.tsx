"use client";

import { LoaderCircle, Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { showGlobalSnackbar } from "@/components/providers/snackbar-provider";
import { getTTSSettings } from "@/lib/stores/tts";
import { synthesizeEdgeTTS } from "@/lib/tts/edge/synthesize";
import { cn } from "@/lib/utils";

type ActivePlayback = { audio: HTMLAudioElement; url: string; stop: () => void } | null;
let activePlayback: ActivePlayback = null;

function stopActivePlayback() {
  activePlayback?.stop();
  activePlayback = null;
  window.dispatchEvent(new Event("flashmaple-tts-stop"));
}

export function AudioPlayButton({
  text,
  label,
  errorLabel,
  className,
}: {
  text: string;
  label: string;
  errorLabel: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    const handleStop = () => {
      abortRef.current?.abort();
      abortRef.current = null;
      audioRef.current = null;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      setState("idle");
    };
    window.addEventListener("flashmaple-tts-stop", handleStop);
    return () => {
      window.removeEventListener("flashmaple-tts-stop", handleStop);
      if (activePlayback?.audio === audioRef.current) stopActivePlayback();
      else handleStop();
    };
  }, []);

  async function togglePlayback() {
    if (state === "playing" || state === "loading") {
      stopActivePlayback();
      return;
    }
    stopActivePlayback();
    const controller = new AbortController();
    abortRef.current = controller;
    setState("loading");
    try {
      const settings = getTTSSettings();
      const signedValue = (value: number, unit: "%" | "Hz") => `${value >= 0 ? "+" : ""}${value}${unit}`;
      const result = await synthesizeEdgeTTS({
        text,
        voice: settings.voice,
        rate: signedValue(settings.rate, "%"),
        pitch: signedValue(settings.pitch, "Hz"),
        volume: signedValue(settings.volume, "%"),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(new Blob([result.audio], { type: result.contentType }));
      const audio = new Audio(url);
      audioRef.current = audio;
      urlRef.current = url;
      const stop = () => {
        audio.pause();
        audio.currentTime = 0;
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) {
          audioRef.current = null;
          urlRef.current = null;
          setState("idle");
        }
      };
      activePlayback = { audio, url, stop };
      audio.addEventListener("ended", stop, { once: true });
      audio.addEventListener("error", stop, { once: true });
      await audio.play();
      setState("playing");
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") showGlobalSnackbar(errorLabel);
      if (activePlayback?.audio === audioRef.current) activePlayback = null;
      setState("idle");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  return (
    <Button type="button" variant="destructive" size="icon" className={cn("ml-1 inline-flex size-7 align-baseline text-primary", className)} aria-label={label} onClick={() => void togglePlayback()}>
      {state === "loading" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : state === "playing" ? <Square className="size-4 fill-current" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
      <span className="sr-only">{label}</span>
    </Button>
  );
}

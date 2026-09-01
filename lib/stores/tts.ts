import { readJsonStorage, writeJsonStorage } from "./storage";

export const TTS_STORAGE_KEY = "FLASH_MAPLE_TTS";


export const TTS_VOICE_OPTIONS = [
  { value: "en-US-AshleyNeural", label: "Ashley", gender: "Female" },
  { value: "en-US-AndrewMultilingualNeural", label: "Andrew", gender: "Male" },
  { value: "en-US-CoraMultilingualNeural", label: "Cora", gender: "Female" },
  { value: "en-US-BrianMultilingualNeural", label: "Brian", gender: "Male" },
  { value: "en-US-SaraNeural", label: "Sara", gender: "Female" },
  { value: "en-US-JasonNeural", label: "Jason", gender: "Male" },
] as const;

export const TTS_VOICE_VALUES = TTS_VOICE_OPTIONS.map((voice) => voice.value);

export type TTSVoice = (typeof TTS_VOICE_VALUES)[number];

export interface TTSSettings {
  voice: TTSVoice;
  rate: number;
  pitch: number;
  volume: number;
}

export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  voice: "en-US-AshleyNeural",
  rate: 0,
  pitch: 0,
  volume: 0,
};

function clampTTSValue(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(-100, Math.min(100, Math.round(number)));
}

export function getTTSSettings(): TTSSettings {
  const stored = readJsonStorage<Partial<TTSSettings>>(TTS_STORAGE_KEY);
  const voice = TTS_VOICE_VALUES.includes(stored?.voice as TTSVoice)
    ? (stored?.voice as TTSVoice)
    : DEFAULT_TTS_SETTINGS.voice;

  return {
    voice,
    rate: clampTTSValue(stored?.rate),
    pitch: clampTTSValue(stored?.pitch),
    volume: clampTTSValue(stored?.volume),
  };
}

export function saveTTSSettings(settings: TTSSettings): void {
  writeJsonStorage(TTS_STORAGE_KEY, settings);
}

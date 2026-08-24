"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  getStoredMood,
  getStoredMoodThemeEnabled,
  normalizeMood,
  saveMood,
  saveMoodThemeEnabled,
  subscribeMoodTheme,
  type MoodType,
} from "@/lib/stores/mood";

export type { MoodType } from "@/lib/stores/mood";

type FlashMoodContextValue = {
  mood: MoodType;
  setMood: (value: string | null | undefined) => void;
  moodThemeEnabled: boolean;
  setMoodThemeEnabled: (enabled: boolean) => void;
};

const FlashMoodContext = createContext<FlashMoodContextValue>({
  mood: "positive",
  setMood: () => {},
  moodThemeEnabled: false,
  setMoodThemeEnabled: () => {},
});

export function FlashMoodProvider({ children }: { children: ReactNode }) {
  const [mood, setMoodState] = useState<MoodType>(() => getStoredMood());
  const moodThemeEnabled = useSyncExternalStore(
    subscribeMoodTheme,
    getStoredMoodThemeEnabled,
    () => false
  );

  useEffect(() => {
    document.documentElement.dataset.mood = mood;
  }, [mood]);

  useEffect(() => {
    document.documentElement.dataset.moodTheme = moodThemeEnabled ? "on" : "off";
  }, [moodThemeEnabled]);

  const setMood = useCallback((value: string | null | undefined) => {
    const normalizedMood = normalizeMood(value);
    setMoodState(normalizedMood);
    saveMood(normalizedMood);
  }, []);

  const setMoodThemeEnabled = useCallback((enabled: boolean) => {
    saveMoodThemeEnabled(enabled);
  }, []);

  const value = useMemo(
    () => ({ mood, setMood, moodThemeEnabled, setMoodThemeEnabled }),
    [mood, moodThemeEnabled, setMood, setMoodThemeEnabled]
  );

  return (
    <FlashMoodContext.Provider value={value}>
      {children}
    </FlashMoodContext.Provider>
  );
}

export function useFlashMoodContext() {
  return useContext(FlashMoodContext);
}

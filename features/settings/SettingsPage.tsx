"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Volume2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Languages, MapPin, Palette } from "lucide-react";
import { useFlashMoodContext } from "@/components/providers/flash-mood-provider";
import { useLocaleContext } from "@/components/providers/locale-provider";
import { regions, useRegionContext } from "@/components/providers/region-provider";
import { useThemeContext } from "@/components/providers/theme-provider";
import { localeNames, locales, localizePath, stripLocaleFromPathname, type Locale } from "@/lib/i18n";
import { savePreferredLocale } from "@/lib/stores/locale";
import type { ThemeMode } from "@/lib/stores/theme";
import { cn } from "@/lib/utils";
import { AppMobileBackHeader, useRouterBack } from "@/components/app";
import { getPreviousAppNavigationPath, replaceCurrentAppNavigationPath } from "@/lib/stores/app-session";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_TTS_SETTINGS, getTTSSettings, saveTTSSettings, TTS_VOICE_OPTIONS, type TTSSettings, type TTSVoice } from "@/lib/stores/tts";
import { useDismissibleMenu } from "@/lib/use-dismissible-menu";
import { appZIndex } from "@/lib/z-index";
import { AudioPlayButton } from "@/components/audio/AudioPlayButton";

const headerMenuSurfaceClass =
  "absolute right-0 top-[calc(100%+0.5rem)] grid gap-0.5 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_18px_46px_rgba(28,28,30,0.16)] backdrop-blur-xl";
const headerMenuItemClass =
  "flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-medium text-muted-foreground no-underline transition-colors hover:bg-primary/10 hover:text-foreground [&_svg]:size-4 [&_svg]:text-primary";

const mobileSettingsMediaQuery = "(max-width: 767px), (pointer: coarse)";
const mobileBackDelayMs = 220;
const TTS_PREVIEW_TEXT = "This is a preview of the selected voice. Welcome to FlashMaple.";
const themeOptionStateClass = {
  system: "[[data-theme-mode=system]_&]:text-primary",
  light: "[[data-theme-mode=light]_&]:text-primary",
  dark: "[[data-theme-mode=dark]_&]:text-primary",
} as const;
const themeCheckStateClass = {
  system: "[[data-theme-mode=system]_&]:block",
  light: "[[data-theme-mode=light]_&]:block",
  dark: "[[data-theme-mode=dark]_&]:block",
} as const;

function localizeAppPath(path: string, locale: Locale) {
  const [pathnameWithLocale, query = ""] = path.split("?", 2);
  const pathname = stripLocaleFromPathname(pathnameWithLocale || "/");
  const nextPathname = localizePath(pathname, locale, true);
  return query ? `${nextPathname}?${query}` : nextPathname;
}

export function SettingsPage() {
  const { dictionary, locale } = useLocaleContext();
  const { isDark, setThemeMode } = useThemeContext();
  const { moodThemeEnabled, setMoodThemeEnabled } = useFlashMoodContext();
  const { region, setRegion } = useRegionContext();
  const [ttsSettings, setTtsSettings] = useState<TTSSettings>(DEFAULT_TTS_SETTINGS);
  const [selectedLocale, setSelectedLocale] = useState(locale);
  const mobileBackTimerRef = useRef<number | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const routerBack = useRouterBack();
  const panel = searchParams.get("panel");
  const showTheme = !panel || panel === "theme";
  const showLanguage = !panel || panel === "language";
  const showRegion = !panel || panel === "region";
  const showVoice = !panel || panel === "voice";
  const voiceDictionary = dictionary.setting.voice ?? {
    title: "Voice",
    voice: { title: "Voice" },
    rate: { title: "Speed" },
    pitch: { title: "Pitch" },
    volume: { title: "Volume" },
  };

  useEffect(() => {
    queueMicrotask(() => setTtsSettings(getTTSSettings()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setSelectedLocale(locale);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    return () => {
      if (mobileBackTimerRef.current !== null) {
        window.clearTimeout(mobileBackTimerRef.current);
      }
    };
  }, []);

  function backOnMobileAfterFeedback() {
    if (!window.matchMedia(mobileSettingsMediaQuery).matches) {
      return false;
    }

    if (mobileBackTimerRef.current !== null) {
      window.clearTimeout(mobileBackTimerRef.current);
    }

    mobileBackTimerRef.current = window.setTimeout(routerBack, mobileBackDelayMs);
    return true;
  }

  function changeThemeMode(nextThemeMode: ThemeMode) {
    setThemeMode(nextThemeMode);
    backOnMobileAfterFeedback();
  }

  function changeMoodTheme(enabled: boolean) {
    setMoodThemeEnabled(enabled);
    backOnMobileAfterFeedback();
  }

  function changeLocale(nextLocale: typeof locales[number]) {
    setSelectedLocale(nextLocale);
    savePreferredLocale(nextLocale);
    if (window.matchMedia(mobileSettingsMediaQuery).matches) {
      const previousPath = getPreviousAppNavigationPath();
      const nextPath = localizeAppPath(previousPath ?? "/", nextLocale);
      replaceCurrentAppNavigationPath(nextPath);

      if (mobileBackTimerRef.current !== null) {
        window.clearTimeout(mobileBackTimerRef.current);
      }

      mobileBackTimerRef.current = window.setTimeout(() => {
        router.replace(nextPath);
      }, mobileBackDelayMs);
      return;
    }

    router.replace(localizePath("/settings?panel=language", nextLocale, true));
  }

  function changeRegion(nextRegion: (typeof regions)[number]["code"]) {
    setRegion(nextRegion);
    backOnMobileAfterFeedback();
  }

  function changeTTSSetting<K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) {
    const next = { ...ttsSettings, [key]: value };
    setTtsSettings(next);
    saveTTSSettings(next);
  }

  const headerTitle =
    panel === "theme"
      ? dictionary.setting.theme.title
      : panel === "language"
      ? dictionary.setting.language.title
      : panel === "region"
      ? dictionary.setting.region.title
      : panel === "voice"
      ? voiceDictionary.title
      : "";

  return (
    <>
      <AppMobileBackHeader key={isDark ? "dark" : "light"} title={headerTitle} />

      <div className="p-4 w-[min(100%,40rem)] mx-auto">
        <header className="hidden py-4 md:flex items-center gap-2.5 [&_svg]:size-2xl [&_svg]:text-primary">
          {panel === "theme" ? (
            <><Palette /><h1 className="text-2xl font-bold">{headerTitle}</h1></>
          ) : null}
          {panel === "language" ? (
            <><Languages /><h1 className="text-2xl font-bold">{headerTitle}</h1></>
          ) : null}
          {panel === "region" ? (
            <><MapPin /><h1 className="text-2xl font-bold">{headerTitle}</h1></>
          ) : null}
          {panel === "voice" ? (
            <><Volume2 /><h1 className="text-2xl font-bold">{headerTitle}</h1></>
          ) : null}
        </header>

        {showTheme ? (
          <section className="grid gap-5 md:gap-2">
            <div className="grid gap-5 md:gap-2">
              {[
                ["system", dictionary.setting.theme.followSystem],
                ["light", dictionary.setting.theme.lightMode],
                ["dark", dictionary.setting.theme.darkMode],
              ].map(([value, label]) => (
                <ThemeOption
                  key={value}
                  label={label}
                  mode={value as ThemeMode}
                  onClick={() => changeThemeMode(value as ThemeMode)}
                />
              ))}
            </div>

            <div className="grid gap-5 md:gap-2">
              <div className="flex min-h-11 w-full items-center justify-between px-0.5">
                <span className={cn("text-lg font-medium", moodThemeEnabled ? "text-primary" : "text-foreground")}>
                  {dictionary.setting.theme.moodThemeTitle}
                </span>
                <Switch
                  className="h-6 w-10 **:data-[slot=switch-thumb]:size-4 **:data-[slot=switch-thumb]:data-[state=checked]:translate-x-5"
                  checked={moodThemeEnabled}
                  onCheckedChange={changeMoodTheme}
                  aria-label={dictionary.setting.theme.moodThemeTitle}
                />
              </div>
            </div>
          </section>
        ) : null}

        {showRegion ? (
          <section className="grid gap-5 md:gap-2">
            {regions.map((item) => (
              <Option
                key={item.code}
                label={item.label}
                active={region === item.code}
                onClick={() => changeRegion(item.code)}
              />
            ))}
          </section>
        ) : null}

        {showLanguage ? (
          <section className="grid gap-5 md:gap-2">
            {locales.map((item) => (
              <Option
                key={item}
                label={localeNames[item]}
                active={selectedLocale === item}
                onClick={() => changeLocale(item)}
              />
            ))}
          </section>
        ) : null}

        {showVoice ? (
          <section className="grid gap-5 md:gap-3">
            <div className="grid gap-1">
              <span className="text-lg font-medium text-foreground">{voiceDictionary.voice.title}</span>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <VoiceSelector value={ttsSettings.voice} onChange={(value) => changeTTSSetting("voice", value)} ariaLabel={voiceDictionary.voice.title} />
                </div>
                <AudioPlayButton
                  text={TTS_PREVIEW_TEXT}
                  label={dictionary.newsDetail.playAudio || "Play audio"}
                  errorLabel={dictionary.newsDetail.audioFailed || "Couldn't play audio"}
                  className="ml-0 size-11 shrink-0"
                />
              </div>
            </div>
            <SpeechSetting label={voiceDictionary.rate.title} value={ttsSettings.rate} onChange={(value) => changeTTSSetting("rate", value)} />
            <SpeechSetting label={voiceDictionary.pitch.title} value={ttsSettings.pitch} onChange={(value) => changeTTSSetting("pitch", value)} />
            <SpeechSetting label={voiceDictionary.volume.title} value={ttsSettings.volume} onChange={(value) => changeTTSSetting("volume", value)} />
          </section>
        ) : null}
      </div>
    </>
  );
}

function SpeechSetting({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-lg font-medium text-foreground">{label}</label>
        <span className="min-w-16 text-right text-muted-foreground" aria-label={`${label} value`}>
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <input
        type="range"
        min={-100}
        max={100}
        step={1}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

function VoiceSelector({ value, onChange, ariaLabel }: { value: TTSVoice; onChange: (value: TTSVoice) => void; ariaLabel: string }) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  useDismissibleMenu(open, menuRef, setOpen);

  const selected = TTS_VOICE_OPTIONS.find((voice) => voice.value === value) ?? TTS_VOICE_OPTIONS[0];
  const displayName = `${selected.label} · ${selected.gender}`;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between rounded-md border border-border/60 bg-card/60 px-3 text-left text-base transition hover:border-primary/40"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{displayName}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? (
        <div className={cn(headerMenuSurfaceClass, "inset-x-0 top-full mt-1", appZIndex.menu)} role="listbox" aria-label={ariaLabel}>
          {TTS_VOICE_OPTIONS.map((voice) => {
            const isSelected = voice.value === value;
            return (
              <button
                key={voice.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(headerMenuItemClass, "w-full justify-between")}
                onClick={() => {
                  onChange(voice.value);
                  setOpen(false);
                }}
              >
                <span>{voice.label} · {voice.gender}</span>
                {isSelected ? <Check className="size-4 text-primary" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Option({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-11 w-full items-center justify-between border-border/60 px-0.5 text-left text-lg font-medium text-foreground",
        active && "text-primary"
      )}
      onClick={onClick}
    >
      <span>{label}</span>
      {active ? <Check className="size-5 text-primary" /> : null}
    </button>
  );
}

function ThemeOption({ label, mode, onClick }: { label: string; mode: ThemeMode; onClick: () => void }) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-11 w-full items-center justify-between border-border/60 px-0.5 text-left text-lg font-medium text-foreground",
        themeOptionStateClass[mode]
      )}
      onClick={onClick}
    >
      <span>{label}</span>
      <Check className={cn("hidden size-5 text-primary", themeCheckStateClass[mode])} />
    </button>
  );
}

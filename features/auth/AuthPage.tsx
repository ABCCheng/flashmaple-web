"use client";

import { Mail, CircleX } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLocaleContext } from "@/components/providers/locale-provider";
import { showGlobalSnackbar } from "@/components/providers/snackbar-provider";
import { AppCodeField, AppField, AppLoadingOverlay, AppPasswordField, useRouterBack } from "@/components/app";
import { Button } from "@/components/ui/button";
import {
  isValidEmail,
  isValidPassword,
  isValidVerifyCode,
  login,
  normalizeEmail,
  oauthLogin,
  requestRegister,
  requestResetPassword,
  resetPassword,
  safeRegister,
} from "@/lib/api/user";
import {
  getSocialAuthConfig,
  getSocialAuthLoginProvider,
  type SocialAuthMode,
  type SocialIdentityProvider,
} from "@/lib/env";
import { dictionaries, localizePath } from "@/lib/i18n";
import {
  buildSocialAuthUrl,
  consumeSocialAuthState,
  getSocialAuthRedirectUri,
  providerLabel,
  type SocialAuthStatePayload,
} from "@/lib/oauth";
import { saveUserInfo } from "@/lib/stores/auth-user";
import { buildSiteTitle } from "@/lib/seo";
import type { UserInfo } from "@/lib/api/user";

type AuthMode = "login" | "register" | "reset";
type FieldErrors = Partial<Record<"email" | "password" | "verifyCode", string>>;

const SOCIAL_AUTH_MESSAGE_TYPE = "flashmaple:social-auth";

type SocialAuthMessage = {
  type: typeof SOCIAL_AUTH_MESSAGE_TYPE;
  code?: string;
  state?: string;
  error?: string;
};

const VERIFY_CODE_COUNTDOWN = 60;
const VERIFY_CODE_MAX_LENGTH = 6;

function normalizeVerifyCodeInput(value: string) {
  return value.replace(/\D/g, "").slice(0, VERIFY_CODE_MAX_LENGTH);
}

function persistLogin(userInfo: UserInfo) {
  saveUserInfo(userInfo);
}

function clearSocialAuthSearchParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.4 35.8 26.9 36 24 36c-5.3 0-9.8-3.1-11.3-7.7l-6.6 5.1C9.5 39.7 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3-3.4 5.3-6.3 6.8l6.3 5.2C39.8 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

export function AuthPage() {
  const { dictionary, locale } = useLocaleContext();
  const router = useRouter();
  const routerBack = useRouterBack();
  const searchParams = useSearchParams();
  const socialAuthInFlightRef = useRef(false);
  const socialAuthCallbackInFlightRef = useRef(false);
  const socialAuthPopupRef = useRef<Window | null>(null);
  const socialAuthPopupTimerRef = useRef<number | null>(null);

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const isEmailValid = useMemo(() => isValidEmail(normalizedEmail), [normalizedEmail]);
  const isPasswordValid = useMemo(() => isValidPassword(password), [password]);
  const isVerifyCodeValid = useMemo(() => isValidVerifyCode(verifyCode), [verifyCode]);
  const isLoginMode = mode === "login";
  const isRegisterMode = mode === "register";
  const isResetMode = mode === "reset";
  const hasSocialAuthCallbackCode = Boolean(searchParams.get("code"));
  const redirectUri = typeof window !== "undefined"
    ? getSocialAuthRedirectUri()
    : "";

  const clearSocialAuthPopup = useCallback((closePopup = false) => {
    if (socialAuthPopupTimerRef.current !== null) {
      window.clearInterval(socialAuthPopupTimerRef.current);
      socialAuthPopupTimerRef.current = null;
    }

    if (closePopup && socialAuthPopupRef.current && !socialAuthPopupRef.current.closed) {
      socialAuthPopupRef.current.close();
    }

    socialAuthPopupRef.current = null;
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = window.setTimeout(() => {
      setCountdown((current) => (current > 1 ? current - 1 : 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown]);

  function buildValidationErrors(targetMode: AuthMode) {
    const nextErrors: FieldErrors = {};

    if (!isValidEmail(normalizedEmail)) {
      nextErrors.email = dictionary.auth.emailError;
    }

    if (!isValidPassword(password)) {
      nextErrors.password = targetMode === "reset" ? dictionary.resetPasswordPage.passwordError : dictionary.auth.passwordError;
    }

    if ((targetMode === "register" || targetMode === "reset") && !isValidVerifyCode(verifyCode)) {
      nextErrors.verifyCode = targetMode === "reset" ? dictionary.resetPasswordPage.verifyCodeError : dictionary.auth.verifyCodeError;
    }

    return nextErrors;
  }

  function validateForSubmit(targetMode: AuthMode) {
    const nextErrors = buildValidationErrors(targetMode);
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateEmailInput(value: string) {
    return value && !isValidEmail(normalizeEmail(value)) ? dictionary.auth.emailError : undefined;
  }

  function validatePasswordInput(value: string, targetMode: AuthMode) {
    if (!value || isValidPassword(value)) return undefined;
    return targetMode === "reset" ? dictionary.resetPasswordPage.passwordError : dictionary.auth.passwordError;
  }

  function validateVerifyCodeInput(value: string, targetMode: AuthMode) {
    if (!value || isValidVerifyCode(value)) return undefined;
    return targetMode === "reset" ? dictionary.resetPasswordPage.verifyCodeError : dictionary.auth.verifyCodeError;
  }

  function clearModeState(nextMode: AuthMode) {
    setMode(nextMode);
    setVerifyCode("");
    setPassword("");
    setFieldErrors({});
    if (nextMode === "login") {
      setCountdown(0);
    }
  }

  const handleSocialAuthCallback = useCallback(async (code: string, statePayload: SocialAuthStatePayload, state?: string) => {
    const callbackLocale = statePayload.locale ?? locale;
    const callbackDictionary = dictionaries[callbackLocale];
    let loginCompleted = false;

    try {
      const res = await oauthLogin(getSocialAuthLoginProvider(statePayload.mode, statePayload.provider), {
        code,
        codeVerifier: statePayload.codeVerifier,
        redirectUri,
        state,
      });

      if (res?.code !== 200 || !res.data) {
        return;
      }

      persistLogin(res.data.userInfo);
      loginCompleted = true;
      showGlobalSnackbar(callbackDictionary.auth.success.replace("{{provider}}", providerLabel(statePayload.provider, callbackDictionary)).replace("{{action}}", callbackDictionary.auth.login));
      router.replace(localizePath("/profile", callbackLocale));
    } finally {
      if (!loginCompleted && new URL(window.location.href).searchParams.has("code")) {
        clearSocialAuthSearchParams();
      }
      clearSocialAuthPopup(true);
      socialAuthCallbackInFlightRef.current = false;
      socialAuthInFlightRef.current = false;
      setSubmitting(false);
    }
  }, [clearSocialAuthPopup, locale, redirectUri, router]);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (window.opener && window.opener !== window && (code || error)) {
      const message: SocialAuthMessage = {
        type: SOCIAL_AUTH_MESSAGE_TYPE,
        code: code ?? undefined,
        state: state ?? undefined,
        error: error ?? undefined,
      };
      window.opener.postMessage(message, window.location.origin);
      window.close();
      return;
    }

    if (error) {
      const statePayload = consumeSocialAuthState(state);
      socialAuthInFlightRef.current = false;
      queueMicrotask(() => setSubmitting(false));
      showGlobalSnackbar(
        statePayload && error === "access_denied"
          ? dictionary.auth.socialCancelled
          : dictionary.auth.socialTokenMissing.replace("{{provider}}", providerLabel(statePayload?.provider, dictionary))
      );
      clearSocialAuthSearchParams();
      return;
    }

    if (!code || socialAuthCallbackInFlightRef.current) return;

    const statePayload = consumeSocialAuthState(state);
    if (!statePayload) {
      showGlobalSnackbar(dictionary.auth.socialTokenMissing.replace("{{provider}}", providerLabel(undefined, dictionary)));
      clearSocialAuthSearchParams();
      return;
    }

    socialAuthCallbackInFlightRef.current = true;
    socialAuthInFlightRef.current = true;
    void Promise.resolve().then(() => {
      setSubmitting(true);
      void handleSocialAuthCallback(code, statePayload, state ?? undefined);
    });
  }, [dictionary, dictionary.auth.socialCancelled, dictionary.auth.socialTokenMissing, handleSocialAuthCallback, searchParams]);

  useEffect(() => {
    function handlePageShow() {
      if (!socialAuthInFlightRef.current) return;

      socialAuthInFlightRef.current = false;
      setSubmitting(false);
      showGlobalSnackbar(dictionary.auth.socialCancelled);
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [dictionary.auth.socialCancelled]);

  useEffect(() => {
    function handleSocialAuthMessage(event: MessageEvent<SocialAuthMessage>) {
      if (event.origin !== window.location.origin || event.data?.type !== SOCIAL_AUTH_MESSAGE_TYPE) {
        return;
      }

      const { code, error, state } = event.data;
      if (socialAuthCallbackInFlightRef.current) return;
      clearSocialAuthPopup(true);

      if (error) {
        const statePayload = consumeSocialAuthState(state ?? null);
        socialAuthInFlightRef.current = false;
        setSubmitting(false);
        showGlobalSnackbar(
          statePayload && error === "access_denied"
            ? dictionary.auth.socialCancelled
            : dictionary.auth.socialTokenMissing.replace("{{provider}}", providerLabel(statePayload?.provider, dictionary))
        );
        return;
      }

      const statePayload = consumeSocialAuthState(state ?? null);
      if (!code || !statePayload) {
        socialAuthInFlightRef.current = false;
        setSubmitting(false);
        showGlobalSnackbar(dictionary.auth.socialTokenMissing.replace("{{provider}}", providerLabel(undefined, dictionary)));
        return;
      }

      socialAuthCallbackInFlightRef.current = true;
      socialAuthInFlightRef.current = true;
      setSubmitting(true);
      void handleSocialAuthCallback(code, statePayload, state);
    }

    window.addEventListener("message", handleSocialAuthMessage);
    return () => {
      window.removeEventListener("message", handleSocialAuthMessage);
      clearSocialAuthPopup();
    };
  }, [clearSocialAuthPopup, dictionary, dictionary.auth.socialCancelled, dictionary.auth.socialTokenMissing, handleSocialAuthCallback]);

  async function handleLoginSubmit() {
    if (!validateForSubmit("login")) return;

    setSubmitting(true);
    try {
      const res = await login(normalizedEmail, password);
      if (res?.code !== 200 || !res.data) {
        return;
      }

      persistLogin(res.data.userInfo);
      showGlobalSnackbar(dictionary.auth.success.replace("{{provider}}", "Email").replace("{{action}}", dictionary.auth.login));
      router.push(localizePath("/profile", locale));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegisterSubmit() {
    if (!validateForSubmit("register")) return;

    setSubmitting(true);
    try {
      const res = await safeRegister(normalizedEmail, verifyCode, password);
      if (res?.code !== 200) {
        return;
      }

      setMode("login");
      setVerifyCode("");
      setPassword("");
      setCountdown(0);
      showGlobalSnackbar(dictionary.auth.success.replace("{{provider}}", "Email").replace("{{action}}", dictionary.auth.register));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPasswordSubmit() {
    if (!validateForSubmit("reset")) return;

    setSubmitting(true);
    try {
      const res = await resetPassword(normalizedEmail, verifyCode, password);
      if (res?.code !== 200) {
        return;
      }

      clearModeState("login");
      showGlobalSnackbar(dictionary.resetPasswordPage.resetSuccess);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "login") {
      await handleLoginSubmit();
      return;
    }

    if (mode === "register") {
      await handleRegisterSubmit();
      return;
    }

    await handleResetPasswordSubmit();
  }

  async function handleRequestVerifyCode() {
    if (!isValidEmail(normalizedEmail)) {
      setFieldErrors((current) => ({ ...current, email: dictionary.auth.emailError }));
      return;
    }

    if (countdown > 0) return;

    setRequestingCode(true);
    try {
      const res = isResetMode ? await requestResetPassword(normalizedEmail) : await requestRegister(normalizedEmail);
      if (res?.code !== 200) {
        return;
      }

      setCountdown(VERIFY_CODE_COUNTDOWN);
      showGlobalSnackbar(isResetMode ? dictionary.resetPasswordPage.requestResetSuccess : dictionary.auth.requestRegisterSuccess);
    } finally {
      setRequestingCode(false);
    }
  }

  async function handleSocialLogin(mode: SocialAuthMode, provider: SocialIdentityProvider) {
    if (submitting || socialAuthInFlightRef.current) return;

    const socialAuthConfig = getSocialAuthConfig(mode, provider);
    if (!socialAuthConfig.clientId) {
      showGlobalSnackbar(dictionary.auth.socialConfigMissing.replace("{{provider}}", providerLabel(provider, dictionary)));
      return;
    }

    socialAuthInFlightRef.current = true;
    setSubmitting(true);
    const useCurrentTab = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
    const popup = useCurrentTab ? null : window.open("", "flashmaple-google-auth", "popup,width=520,height=720");

    try {
      const authUrl = await buildSocialAuthUrl(mode, provider, locale);
      if (useCurrentTab) {
        window.location.href = authUrl;
        return;
      }

      if (!popup) {
        window.location.href = authUrl;
        return;
      }

      socialAuthPopupRef.current = popup;
      popup.location.href = authUrl;
      popup.focus();
      socialAuthPopupTimerRef.current = window.setInterval(() => {
        if (!popup.closed || !socialAuthInFlightRef.current) {
          return;
        }

        clearSocialAuthPopup();
        socialAuthInFlightRef.current = false;
        setSubmitting(false);
        showGlobalSnackbar(dictionary.auth.socialCancelled);
      }, 500);
    } catch (error) {
      clearSocialAuthPopup(true);
      socialAuthInFlightRef.current = false;
      setSubmitting(false);
      showGlobalSnackbar(error instanceof Error ? error.message : dictionary.network.requestFailed);
    }
  }

  const submitDisabled =
    submitting ||
    requestingCode ||
    !isEmailValid ||
    !isPasswordValid ||
    (isRegisterMode || isResetMode ? !isVerifyCodeValid : false);
  const sendCodeDisabled = submitting || requestingCode || countdown > 0 || !isEmailValid;

  const title = isLoginMode ? dictionary.auth.titleLogin : isRegisterMode ? dictionary.auth.titleRegister : dictionary.resetPasswordPage.title;
  const subtitle = isLoginMode ? dictionary.auth.subtitleLogin : isRegisterMode ? dictionary.auth.subtitleRegister : dictionary.resetPasswordPage.subtitle;
  const submitLabel = isLoginMode ? dictionary.auth.emailLogin : isRegisterMode ? dictionary.auth.emailRegister : dictionary.resetPasswordPage.submit;

  useEffect(() => {
    if (!hasSocialAuthCallbackCode) {
      document.title = buildSiteTitle(title);
    }
  }, [hasSocialAuthCallbackCode, title]);

  if (hasSocialAuthCallbackCode) {
    return <AppLoadingOverlay />;
  }

  return (
    <div className="fixed inset-0 flex overflow-y-auto p-4">
      <form noValidate onSubmit={handleSubmit} className="relative my-auto min-h-[26rem] w-full shrink-0 rounded-lg border p-4 shadow-sm md:mx-auto md:w-[min(100%,40rem)]">
        <Button type="button" size="icon" variant="destructive" className="absolute right-1 top-1 cursor-pointer text-primary"aria-label="Close"
          onClick={routerBack}
        >
          <CircleX />
        </Button>

        <div className="text-left">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <AppField
          className="pt-4"
          value={email}
          onChange={(event) => {
            const nextEmail = event.target.value;
            setEmail(nextEmail);
            setFieldErrors((current) => ({ ...current, email: validateEmailInput(nextEmail) }));
          }}
          onClear={() => {
            setEmail("");
            setFieldErrors((current) => ({ ...current, email: undefined }));
          }}
          type="email"
          autoComplete="email username"
          inputMode="email"
          placeholder={dictionary.auth.email}
          error={fieldErrors.email}
        />

        
        {(isRegisterMode || isResetMode) ? (
          <AppCodeField
            className="pb-2 pt-2"
            value={verifyCode}
            onChange={(event) => {
              const nextVerifyCode = normalizeVerifyCodeInput(event.target.value);
              setVerifyCode(nextVerifyCode);
              setFieldErrors((current) => ({ ...current, verifyCode: validateVerifyCodeInput(nextVerifyCode, mode) }));
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={dictionary.auth.verifyCode}
            error={fieldErrors.verifyCode}
            actionLabel={countdown > 0 ? `${countdown}s` : dictionary.auth.sendVerifyCode}
            actionDisabled={sendCodeDisabled}
            onAction={handleRequestVerifyCode}
          />
        ) : null}

        {/* 忘记密码 */}
        <div className="text-right">
          {isLoginMode ? (
            <button
              type="button"
              className="text-sm font-medium text-primary cursor-pointer"
              onClick={() => clearModeState("reset")}
            >
              {dictionary.auth.forgotPassword}
            </button>
          ) : null}
        </div>

        <AppPasswordField
          value={password}
          onChange={(event) => {
            const nextPassword = event.target.value;
            setPassword(nextPassword);
            setFieldErrors((current) => ({ ...current, password: validatePasswordInput(nextPassword, mode) }));
          }}
          visible={showPassword}
          onVisibleChange={setShowPassword}
          autoComplete={isLoginMode ? "current-password" : "new-password"}
          placeholder={isResetMode ? dictionary.resetPasswordPage.newPassword : dictionary.auth.password}
          error={fieldErrors.password}
        />

        <Button type="submit" className="mt-2 w-full text-(--button-foreground) cursor-pointer" disabled={submitDisabled}>
          <Mail />
          {submitLabel}
        </Button>

        {isLoginMode ? (
          <div className="pt-1 pb-2 gap-1 flex flex-col items-center justify-center">
            <div className="pt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>{dictionary.auth.noAccount}</span>
              <button
                type="button"
                className="font-medium text-primary cursor-pointer"
                onClick={() => clearModeState("register")}
              >
                {dictionary.auth.goRegister}
              </button>
            </div>

            <div className="w-full pt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span>{dictionary.auth.quickLogin}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Button type="button" size="icon-lg" variant="ghost" aria-label="Continue with Google" className="pt-2 cursor-pointer" onClick={() => void handleSocialLogin("DIRECT", "GOOGLE")} disabled={submitting}>
              <GoogleIcon />
            </Button>
          </div>
        ) : (

          <div className="pt-2 pb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>{dictionary.auth.hasAccount}</span>
            <button
              type="button"
              className="font-medium text-primary cursor-pointer"
              onClick={() => clearModeState("login")}
            >
              {dictionary.auth.goLogin}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

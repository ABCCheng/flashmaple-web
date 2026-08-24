import {
  getSocialAuthConfig,
  getSocialAuthLoginProvider,
  type SocialAuthMode,
  type SocialIdentityProvider,
} from "@/lib/env";
import { randomBytes, randomId, sha256Bytes } from "@/lib/browser-crypto";
import { type Dictionary, type Locale } from "@/lib/i18n";
import {
  storeSocialAuthState,
  type SocialAuthStatePayload,
} from "@/lib/stores/oauth-state";

export { consumeSocialAuthState, peekSocialAuthState } from "@/lib/stores/oauth-state";
export type { SocialAuthStatePayload } from "@/lib/stores/oauth-state";

export function providerLabel(provider: string | undefined, dict: Dictionary) {
  if (provider === "EMAIL") return dict.profile.providers.email;
  if (provider === "GOOGLE") return dict.profile.providers.google;
  return dict.profile.providers.unknown;
}

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function getSocialAuthRedirectUri() {
  return `${window.location.origin}/app/auth`;
}

export async function buildSocialAuthUrl(
  mode: SocialAuthMode,
  provider: SocialIdentityProvider,
  locale: Locale,
) {
  const config = getSocialAuthConfig(mode, provider);
  const loginProvider = getSocialAuthLoginProvider(mode, provider);
  if (!config.clientId) {
    throw new Error(`${loginProvider} OAuth client is not configured.`);
  }

  const redirectUri = getSocialAuthRedirectUri();
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(await sha256Bytes(verifier));
  const nonce = randomId();
  const statePayload: SocialAuthStatePayload & { createdAt: number } = {
    nonce,
    codeVerifier: verifier,
    locale,
    mode,
    provider,
    createdAt: Date.now(),
  };

  const url = new URL(config.authorizationEndpoint);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  storeSocialAuthState(statePayload);
  url.searchParams.set("state", nonce);

  if (mode === "FUSIONAUTH") {
    const providerHint = config.providerHints?.[provider];
    if (!providerHint) {
      throw new Error(`FusionAuth ${loginProvider} identity provider is not configured.`);
    }
    url.searchParams.set("idp_hint", providerHint);
    url.searchParams.set("prompt", "login");
  } else if (provider === "GOOGLE") {
    url.searchParams.set("prompt", "select_account");
  }

  return url.toString();
}

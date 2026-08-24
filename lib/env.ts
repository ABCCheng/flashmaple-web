export type AppEnv = "development" | "test" | "production";

function resolveBuildConfig(name: string, value: string | undefined, fallback = "") {
  const resolved = value?.trim() ?? "";
  if (resolved) return resolved;
  if (process.env.NEXT_PUBLIC_ENV === "production") {
    throw new Error(`${name} must be configured for a production build.`);
  }
  return fallback;
}

function resolveAppEnv(): AppEnv {
  const explicit = process.env.NEXT_PUBLIC_ENV;
  if (explicit === "development" || explicit === "test" || explicit === "production") {
    return explicit;
  }
  return process.env.NODE_ENV === "development" ? "development" : "production";
}

export const APP_ENV = resolveAppEnv();
export const API_ORIGIN = resolveBuildConfig(
  "NEXT_PUBLIC_API_ORIGIN",
  process.env.NEXT_PUBLIC_API_ORIGIN,
  "http://127.0.0.1:9001",
);
export const COOKIE_DOMAIN = resolveBuildConfig(
  "NEXT_PUBLIC_COOKIE_DOMAIN",
  process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
);

export type SocialIdentityProvider = "GOOGLE";
export type SocialAuthMode = "DIRECT" | "FUSIONAUTH";
export type SocialAuthLoginProvider = SocialIdentityProvider | "FUSIONAUTH";

export interface SocialAuthProviderConfig {
  authorizationEndpoint: string;
  clientId: string;
  scope: string;
  providerHints?: Partial<Record<SocialIdentityProvider, string>>;
}

export const SOCIAL_AUTH_CONFIG = {
  direct: {
    GOOGLE: {
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth?access_type=offline",
      clientId: resolveBuildConfig(
        "NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID",
        process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID,
      ),
      scope: "openid email profile",
    },
  },
  fusionAuth: {
    authorizationEndpoint: resolveBuildConfig(
      "NEXT_PUBLIC_FUSIONAUTH_AUTHORIZATION_ENDPOINT",
      process.env.NEXT_PUBLIC_FUSIONAUTH_AUTHORIZATION_ENDPOINT,
    ),
    clientId: resolveBuildConfig(
      "NEXT_PUBLIC_FUSIONAUTH_CLIENT_ID",
      process.env.NEXT_PUBLIC_FUSIONAUTH_CLIENT_ID,
    ),
    scope: "openid offline_access email profile",
    providerHints: {
      GOOGLE: resolveBuildConfig(
        "NEXT_PUBLIC_FUSIONAUTH_GOOGLE_IDP_ID",
        process.env.NEXT_PUBLIC_FUSIONAUTH_GOOGLE_IDP_ID,
      ),
    },
  },
};

export function getSocialAuthConfig(
  mode: SocialAuthMode,
  provider: SocialIdentityProvider,
): SocialAuthProviderConfig {
  return mode === "FUSIONAUTH"
    ? SOCIAL_AUTH_CONFIG.fusionAuth
    : SOCIAL_AUTH_CONFIG.direct[provider];
}

export function getSocialAuthLoginProvider(
  mode: SocialAuthMode,
  provider: SocialIdentityProvider,
): SocialAuthLoginProvider {
  return mode === "FUSIONAUTH" ? "FUSIONAUTH" : provider;
}

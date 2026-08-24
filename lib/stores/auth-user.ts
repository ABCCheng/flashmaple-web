import type { UserInfo } from "@/lib/api/user";
import { APP_ENV, COOKIE_DOMAIN } from "@/lib/env";
import { notifyAuthStateChanged } from "./auth-events";
import { readJsonStorage, removeStorage, writeJsonStorage } from "./storage";

const userInfoKey = "FLASH_MAPLE_USER_INFO";
const authHintCookieName = "X-Cookie-Auth-Hint";
type StoredUserInfo = Pick<UserInfo, "userName" | "avatarType" | "avatar">
  & Partial<Pick<UserInfo, "userId" | "identityType">>;
export type LocalUserInfo = StoredUserInfo;

export function isAuthenticated() {
  return hasAuthHint();
}

export function hasAuthHint() {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => {
    const [name, value] = part.trim().split("=", 2);
    return name === authHintCookieName && value === "1";
  });
}

export function getAuthIdentity() {
  const userInfo = getUserInfo();
  return userInfo?.userId && isIdentityType(userInfo.identityType ?? "")
    ? { userId: userInfo.userId, identityType: userInfo.identityType }
    : null;
}

function isIdentityType(value: string): value is UserInfo["identityType"] {
  return value === "EMAIL" || value === "GOOGLE";
}

export function getUserInfo(): LocalUserInfo | null {
  const stored = readJsonStorage<StoredUserInfo>(userInfoKey);
  if (!stored) return null;

  const { userId, identityType, userName, avatarType, avatar } = stored;

  return {
    userId,
    identityType,
    userName,
    avatarType,
    avatar,
  };
}

export function saveUserInfo(userInfo: UserInfo) {
  const storedUserInfo: StoredUserInfo = {
    userId: userInfo.userId,
    identityType: userInfo.identityType,
    userName: userInfo.userName,
    avatarType: userInfo.avatarType,
    avatar: userInfo.avatar,
  };
  writeJsonStorage(userInfoKey, storedUserInfo);
  notifyAuthStateChanged();
}

export function clearUserInfo() {
  removeStorage(userInfoKey);
  clearAuthHintCookie();
  notifyAuthStateChanged();
}

function clearAuthHintCookie() {
  if (typeof document === "undefined") return;

  const secureAttribute = APP_ENV === "production" ? "; Secure" : "";
  for (const domain of new Set(["", COOKIE_DOMAIN])) {
    const domainAttribute = domain ? `; Domain=${domain}` : "";
    document.cookie = `${authHintCookieName}=; Max-Age=0; Path=/${domainAttribute}${secureAttribute}; SameSite=Lax`;
  }
}

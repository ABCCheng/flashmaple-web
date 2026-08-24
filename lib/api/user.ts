import { ensureDeviceReady, get, post } from "./client";
import { reuseInFlightRequest } from "./request-cache";
import type { ApiResponse } from "./types";
import type { SocialAuthLoginProvider } from "../env";

const USER_PREFIX = "/api/user";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^[\x21-\x7E]{8,24}$/;
const VERIFY_CODE_REGEX = /^\d{6}$/;

export type IdentityType = "EMAIL" | "GOOGLE";
export type AvatarType = "TEXT" | "IMAGE_URL" | "BASE64";
export type OAuthProvider = SocialAuthLoginProvider;

export interface UserInfo {
  userId: string;
  identityType: IdentityType;
  userName: string;
  avatarType: AvatarType;
  avatar: string;
}

export interface LoginInfo {
  userInfo: UserInfo;
}

export interface OAuthLoginPayload {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  state?: string;
}

export function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

export function isValidEmail(email: string) {
  return EMAIL_REGEX.test(normalizeEmail(email));
}

export function isValidPassword(password: string) {
  return PASSWORD_REGEX.test(password);
}

export function isValidVerifyCode(verifyCode: string) {
  return VERIFY_CODE_REGEX.test(verifyCode);
}

function assertEmail(email: string) {
  if (!isValidEmail(email)) throw new Error("Invalid email");
}

function assertPassword(password: string) {
  if (!isValidPassword(password)) throw new Error("Invalid password");
}

function assertVerifyCode(verifyCode: string) {
  if (!isValidVerifyCode(verifyCode)) throw new Error("Invalid verify code");
}

export async function activateDevice() {
  return ensureDeviceReady();
}

export async function requestRegister(email: string) {
  const normalizedEmail = normalizeEmail(email);
  assertEmail(normalizedEmail);
  return post<ApiResponse<void>>(`${USER_PREFIX}/request-register`, { email: normalizedEmail });
}

export async function safeRegister(email: string, verifyCode: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  assertEmail(normalizedEmail);
  assertVerifyCode(verifyCode);
  assertPassword(password);
  return post<ApiResponse<string>>(`${USER_PREFIX}/safe-register`, {
    email: normalizedEmail,
    verifyCode,
    password,
  });
}

export async function login(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  assertEmail(normalizedEmail);
  assertPassword(password);
  return post<ApiResponse<LoginInfo>>(`${USER_PREFIX}/login`, {
    email: normalizedEmail,
    password,
  });
}

export async function oauthLogin(provider: OAuthProvider, payload: OAuthLoginPayload) {
  return post<ApiResponse<LoginInfo>>(`${USER_PREFIX}/oauth/${provider}/login`, payload);
}

export async function getProfile(config?: { silent?: boolean }) {
  return reuseInFlightRequest(
    "profile",
    () => get<ApiResponse<UserInfo>>(`${USER_PREFIX}/profile`, undefined, config)
  );
}

export async function logout() {
  return post<ApiResponse<void>>(`${USER_PREFIX}/logout`);
}

export async function requestResetPassword(email: string) {
  const normalizedEmail = normalizeEmail(email);
  assertEmail(normalizedEmail);
  return post<ApiResponse<void>>(`${USER_PREFIX}/request-reset-password`, { email: normalizedEmail });
}

export async function resetPassword(email: string, verifyCode: string, newPassword: string) {
  const normalizedEmail = normalizeEmail(email);
  assertEmail(normalizedEmail);
  assertVerifyCode(verifyCode);
  assertPassword(newPassword);
  return post<ApiResponse<void>>(`${USER_PREFIX}/reset-password`, {
    email: normalizedEmail,
    verifyCode,
    newPassword,
  });
}

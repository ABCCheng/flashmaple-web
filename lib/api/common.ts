import { post } from "./client";
import type { ApiResponse } from "./types";

const COMMON_PREFIX = "/api/common";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

export function isValidEmail(email: string) {
  return EMAIL_REGEX.test(normalizeEmail(email));
}

export async function feedback(userEmail: string, subject: string, message: string) {
  const normalizedEmail = normalizeEmail(userEmail);
  return post<ApiResponse<void>>(`${COMMON_PREFIX}/feedback`, {
    appName: "flashmaple",
    userName: "",
    userEmail: normalizedEmail,
    subject,
    message,
  });
}

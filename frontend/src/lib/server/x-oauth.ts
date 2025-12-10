import { createHash, randomBytes } from "crypto";
import type { XProfile } from "@/types/social";

const BASE64_REGEX = /-/g;
const BASE64_URL_SAFE_REGEX = /_/g;

export const STATE_COOKIE = "x_oauth_state";
export const CODE_VERIFIER_COOKIE = "x_oauth_code_verifier";
export const PROFILE_COOKIE = "x_profile";

const base64UrlEncodeBuffer = (buffer: Buffer) =>
  buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");

export const encodeStringToBase64Url = (value: string) =>
  base64UrlEncodeBuffer(Buffer.from(value, "utf-8"));

export const decodeBase64UrlToString = (value: string) => {
  const normalized = value.replace(BASE64_REGEX, "+").replace(BASE64_URL_SAFE_REGEX, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64").toString("utf-8");
};

export const generateState = () => base64UrlEncodeBuffer(randomBytes(16));
export const generateCodeVerifier = () => base64UrlEncodeBuffer(randomBytes(32));

export const generateCodeChallenge = (codeVerifier: string) =>
  base64UrlEncodeBuffer(createHash("sha256").update(codeVerifier).digest());

export const serializeProfile = (profile: XProfile) =>
  encodeStringToBase64Url(JSON.stringify(profile));

export const deserializeProfile = (value: string): XProfile | null => {
  try {
    return JSON.parse(decodeBase64UrlToString(value)) as XProfile;
  } catch {
    return null;
  }
};



import { randomBytes } from "crypto";
import type { FarcasterProfile } from "@/types/social";

const BASE64_REGEX = /-/g;
const BASE64_URL_SAFE_REGEX = /_/g;

export const FARCASTER_STATE_COOKIE = "fc_oauth_state";
export const FARCASTER_PROFILE_COOKIE = "fc_profile";

const base64UrlEncodeBuffer = (buffer: Buffer) =>
  buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");

const encodeStringToBase64Url = (value: string) =>
  base64UrlEncodeBuffer(Buffer.from(value, "utf-8"));

export const decodeBase64UrlToString = (value: string) => {
  const normalized = value.replace(BASE64_REGEX, "+").replace(BASE64_URL_SAFE_REGEX, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64").toString("utf-8");
};

export const generateFarcasterState = () =>
  base64UrlEncodeBuffer(randomBytes(16));

export const serializeFarcasterProfile = (profile: FarcasterProfile) =>
  encodeStringToBase64Url(JSON.stringify(profile));

export const deserializeFarcasterProfile = (
  value: string
): FarcasterProfile | null => {
  try {
    return JSON.parse(decodeBase64UrlToString(value)) as FarcasterProfile;
  } catch {
    return null;
  }
};



type FarcasterIdentity = {
  username?: string | null;
  fid?: number | null;
};

const normalizeHandle = (handle?: string | null) => {
  if (!handle) {
    return "";
  }
  return handle.replace(/^@/, "").trim();
};

export const getFarcasterProfileUrl = (identity?: FarcasterIdentity) => {
  const handle = normalizeHandle(identity?.username);
  if (handle) {
    return `https://warpcast.com/${handle}`;
  }
  if (identity?.fid) {
    return `https://warpcast.com/~/profile/${identity.fid}`;
  }
  return "https://warpcast.com";
};

export const getXProfileUrl = (handle?: string | null) => {
  const normalized =
    normalizeHandle(handle) || normalizeHandle(process.env.NEXT_PUBLIC_DEFAULT_X_HANDLE);
  return normalized ? `https://x.com/${normalized}` : "https://x.com";
};


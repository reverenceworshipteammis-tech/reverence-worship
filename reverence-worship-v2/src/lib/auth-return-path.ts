const DEFAULT_AUTH_RETURN_PATH = "/admin/dashboard";

export function safeAuthReturnPath(value: unknown, fallback = DEFAULT_AUTH_RETURN_PATH) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return fallback;

  try {
    const url = new URL(value, "https://reverence.local");
    if (url.origin !== "https://reverence.local") return fallback;
    if (["/login", "/change-password", "/complete-profile", "/logout"].includes(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function authPathWithReturnTo(pathname: string, returnTo: unknown) {
  const safeReturnTo = safeAuthReturnPath(returnTo);
  if (safeReturnTo === DEFAULT_AUTH_RETURN_PATH) return pathname;
  const params = new URLSearchParams({ next: safeReturnTo });
  return `${pathname}?${params.toString()}`;
}

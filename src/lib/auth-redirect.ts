// Login and confirmation links may return only to an internal application path.
export function safeAuthRedirect(
  value: string | null,
  fallback = "/account",
): string {
  if (!value) return fallback;
  function rejected(reason: string) {
    console.warn("[auth-redirect] Invalid return target rejected:", reason);
    return fallback;
  }
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return rejected("non-local or malformed path");
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u001f]/.test(decoded))
      return rejected("encoded separator or control character");
    const parsed = new URL(value, "https://silkincom.invalid");
    if (parsed.pathname.startsWith("//"))
      return rejected("normalized external-looking path");
    if (parsed.origin !== "https://silkincom.invalid")
      return rejected("external origin");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return rejected("invalid URL encoding");
  }
}

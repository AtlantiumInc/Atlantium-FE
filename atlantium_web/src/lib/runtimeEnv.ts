const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isLocalUrl(value: string) {
  try {
    return LOCAL_HOSTS.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

function isLocalBrowser() {
  if (typeof window === "undefined") return false;
  return LOCAL_HOSTS.has(window.location.hostname);
}

export function publicRuntimeUrl(configured: string | undefined, productionDefault: string) {
  const value = configured?.trim() || productionDefault;

  if (!isLocalBrowser() && isLocalUrl(value)) {
    return productionDefault;
  }

  return value;
}

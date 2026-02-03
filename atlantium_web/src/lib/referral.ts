const REFERRAL_KEY = "atlantium_ref";
const REFERRAL_EXPIRY_KEY = "atlantium_ref_expiry";
const EXPIRY_DAYS = 30;

export function captureReferralCode(): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const refCode = params.get("ref");

  if (refCode) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + EXPIRY_DAYS);

    localStorage.setItem(REFERRAL_KEY, refCode);
    localStorage.setItem(REFERRAL_EXPIRY_KEY, expiryDate.toISOString());

    // Clean up URL without reload
    params.delete("ref");
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }
}

export function getReferralCode(): string | null {
  if (typeof window === "undefined") return null;

  const refCode = localStorage.getItem(REFERRAL_KEY);
  const expiry = localStorage.getItem(REFERRAL_EXPIRY_KEY);

  if (!refCode || !expiry) return null;

  if (new Date() > new Date(expiry)) {
    clearReferralCode();
    return null;
  }

  return refCode;
}

export function clearReferralCode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REFERRAL_KEY);
  localStorage.removeItem(REFERRAL_EXPIRY_KEY);
}

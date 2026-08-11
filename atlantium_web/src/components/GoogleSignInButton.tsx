import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-5 w-5"} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

interface GoogleSignInButtonProps {
  /** Where better-auth sends the browser after Google consent completes. */
  callbackURL: string;
  label?: string;
  className?: string;
}

/**
 * High-contrast Google sign-in button. Deliberately a plain <button> with a
 * solid white background in BOTH themes so it always reads as the Google
 * button — shadcn variants kept washing it out on dark pages.
 */
export function GoogleSignInButton({ callbackURL, label, className }: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const { url } = await api.googleSignInStart(callbackURL);
      window.location.href = url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed");
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "w-full h-12 flex items-center justify-center gap-3 rounded-lg",
        "bg-white text-[#1f1f1f] text-sm font-semibold",
        "border border-gray-300 shadow-sm",
        "hover:bg-gray-50 active:bg-gray-100 transition-colors",
        "disabled:opacity-70 disabled:cursor-not-allowed",
        className,
      )}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
      ) : (
        <GoogleLogo />
      )}
      {label ?? "Continue with Google"}
    </button>
  );
}

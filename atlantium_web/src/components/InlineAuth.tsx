import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { api, type User } from "@/lib/api";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type EmailFormValues = z.infer<typeof emailSchema>;

const OTP_LENGTH = 6;

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

interface InlineAuthProps {
  onSuccess: (user: User, token: string) => void;
  ctaText?: string;
}

export function InlineAuth({ onSuccess, ctaText = "Continue" }: InlineAuthProps) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const handleEmailSubmit = async (values: EmailFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      await api.requestOtp(values.email);
      setEmail(values.email);
      setStep("otp");
      toast.success("OTP sent to your email");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join("");

    if (code.length !== OTP_LENGTH) {
      setError("Please enter the full 6-digit code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.verifyOtp(email, code);
      onSuccess(response.user, response.auth_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtpDigits(next);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleBack = () => {
    setStep("email");
    setError(null);
    setOtpDigits(Array(OTP_LENGTH).fill(""));
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await api.requestOtp(email);
      toast.success("OTP resent to your email");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend OTP";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const { url } = await api.getGoogleAuthUrl();
      window.location.href = url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start Google sign-in";
      toast.error(message);
      setIsLoading(false);
    }
  };

  if (step === "email") {
    return (
      <div className="w-full">
        {error && (
          <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
            {error}
          </div>
        )}

        <Form {...emailForm}>
          <form
            onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
            className="space-y-4"
          >
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Email address"
                      className="h-12 px-4 text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                ctaText
              )}
            </Button>
          </form>
        </Form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background px-4 text-muted-foreground">or</span>
          </div>
        </div>

        {/* Google sign in */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 text-base font-medium gap-3"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button
        onClick={handleBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <p className="text-sm text-muted-foreground mb-4">
        Enter the OTP code sent to{" "}
        <span className="font-medium text-foreground">{maskEmail(email)}</span>
      </p>

      {error && (
        <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleOtpSubmit} className="space-y-4">
        <div className="flex gap-2" onPaste={handleOtpPaste}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={otpDigits[i]}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              autoFocus={i === 0}
              className="h-12 w-full rounded-lg border-2 border-border bg-background text-center text-lg font-semibold text-foreground outline-none transition-colors focus:border-foreground"
            />
          ))}
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-medium"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>

        <p className="text-center text-sm">
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={isLoading}
            className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors disabled:opacity-50"
          >
            Send code again
          </button>
        </p>
      </form>
    </div>
  );
}

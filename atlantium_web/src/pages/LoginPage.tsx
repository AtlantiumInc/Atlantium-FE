import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { getReferralCode, clearReferralCode } from "@/lib/referral";

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

const testimonials = [
  {
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80",
    quote: "The Frontier Feed changed how I stay ahead in AI. I was shipping features before my competitors even heard the news.",
    name: "Marcus Rivera",
    role: "CTO, Synth Labs",
  },
  {
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    quote: "Atlantium's events connected me with the exact investors I needed. Closed our seed round in three weeks.",
    name: "Priya Sharma",
    role: "Founder, NeuralPath",
  },
  {
    image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=80",
    quote: "The community here is different. Everyone is building, shipping, and helping each other win. No noise, just signal.",
    name: "Jordan Kim",
    role: "Engineer, Scale AI",
  },
];

export function LoginPage() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { login, checkAuth } = useAuth();
  const navigate = useNavigate();

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % testimonials.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [nextSlide]);

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
      const refCode = getReferralCode();
      const response = await api.verifyOtp(email, code, refCode || undefined);
      // Clear ref_code after successful verification
      if (refCode) clearReferralCode();
      login(response.auth_token, response.user);
      // Fetch full user data (including profile with registration_details)
      const fullUser = await checkAuth();

      // Check onboarding status from the freshly fetched user data
      const profile = (fullUser as unknown as Record<string, unknown>)?._profile as Record<string, unknown> | undefined;
      const registrationDetails = profile?.registration_details as Record<string, unknown> | undefined;
      const isOnboardingCompleted = registrationDetails?.is_completed === true;

      if (isOnboardingCompleted) {
        navigate("/dashboard");
      } else {
        navigate("/onboarding");
      }
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

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        {/* Header */}
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Atlantium" className="h-7 w-7" />
            <span className="text-lg font-bold tracking-tight">Atlantium</span>
          </Link>
        </div>

        {/* Form content */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-12 lg:px-16">
          <div className="w-full max-w-[420px]">
            <AnimatePresence mode="wait">
              {step === "email" ? (
                <motion.div
                  key="email-step"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
                    Welcome back
                  </h1>
                  <p className="text-muted-foreground mb-8">
                    Sign in to your Atlantium account to continue.
                  </p>

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
                          "Continue"
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

                  {/* Sign up link */}
                  <p className="mt-8 text-sm text-muted-foreground text-center">
                    Don't have an account?{" "}
                    <Link to="/signup" className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors">
                      Sign up
                    </Link>
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="otp-step"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>

                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
                    Enter the code
                  </h1>
                  <p className="text-muted-foreground mb-8 leading-relaxed">
                    Enter the OTP code that we sent to your email{" "}
                    <span className="font-medium text-foreground">{maskEmail(email)}</span>{" "}
                    and be careful not to share the code with anyone.
                  </p>

                  {error && (
                    <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleOtpSubmit} className="space-y-6">
                    <div className="flex gap-2 sm:gap-3" onPaste={handleOtpPaste}>
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
                          className="h-14 w-full rounded-lg border-2 border-border bg-background text-center text-xl font-semibold text-foreground outline-none transition-colors focus:border-foreground"
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
                        "Continue"
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

                  <p className="mt-8 text-xs text-muted-foreground text-center leading-relaxed">
                    By signing in or creating an account, you agree with our{" "}
                    <Link to="/policies" className="underline underline-offset-4 hover:text-foreground transition-colors font-medium">
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground transition-colors font-medium">
                      Privacy Statement
                    </Link>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Right side - Image carousel */}
      <div className="hidden lg:block lg:w-1/2 p-4">
        <div className="relative h-full w-full rounded-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentSlide}
              src={testimonials[currentSlide].image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
            />
          </AnimatePresence>

          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

          {/* Testimonial content */}
          <div className="absolute inset-0 flex flex-col justify-end p-8 lg:p-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <blockquote className="text-xl lg:text-2xl font-medium text-white leading-relaxed mb-6">
                  "{testimonials[currentSlide].quote}"
                </blockquote>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">
                      {testimonials[currentSlide].name}
                    </p>
                    <p className="text-white/60 text-sm">
                      {testimonials[currentSlide].role}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={prevSlide}
                      className="h-9 w-9 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:border-white/40 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="h-9 w-9 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:border-white/40 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slide indicators */}
            <div className="flex gap-1.5 mt-5">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentSlide
                      ? "w-8 bg-white"
                      : "w-4 bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

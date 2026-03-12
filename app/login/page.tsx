"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  KeyRound,
  Link2,
  CheckCircle2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SignInMethod = "password" | "otp" | "magic-link";

const checkUserExists = async (email: string): Promise<boolean> => {
  try {
    const response = await fetch("/api/auth/check-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    return data.exists === true;
  } catch {
    return false;
  }
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [activeMethod, setActiveMethod] = useState<SignInMethod>("password");
  const [error, setError] = useState("");

  const showError = (message: string) => setError(message);
  const clearError = () => setError("");

  const resetStates = () => {
    setOtpSent(false);
    setMagicLinkSent(false);
    setOtp("");
    clearError();
  };

  const handleMethodChange = (method: string) => {
    setActiveMethod(method as SignInMethod);
    resetStates();
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsLoading(true);

    try {
      const result = await authClient.signIn.email({ email, password });

      if (result.error) {
        if (
          result.error.message?.toLowerCase().includes("email") &&
          result.error.message?.toLowerCase().includes("verif")
        ) {
          sessionStorage.setItem("verifyEmail", email);
          router.push("/verify-email");
          return;
        }
        showError(result.error.message || "Invalid email or password");
        return;
      }

      router.push("/chat");
      router.refresh();
    } catch {
      showError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email) {
      showError("Please enter your email address");
      return;
    }
    clearError();
    setIsLoading(true);

    try {
      const exists = await checkUserExists(email);
      if (!exists) {
        showError("No account found with this email. Please contact admin.");
        return;
      }

      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });

      if (result.error) {
        showError(result.error.message || "Failed to send OTP");
        return;
      }

      setOtpSent(true);
    } catch {
      showError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      showError("Please enter a valid 6-digit OTP");
      return;
    }
    clearError();
    setIsLoading(true);

    try {
      const result = await authClient.signIn.emailOtp({ email, otp });

      if (result.error) {
        showError(result.error.message || "Invalid OTP");
        return;
      }

      router.push("/chat");
      router.refresh();
    } catch {
      showError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      showError("Please enter your email address");
      return;
    }
    clearError();
    setIsLoading(true);

    try {
      const exists = await checkUserExists(email);
      if (!exists) {
        showError("No account found with this email. Please contact admin.");
        return;
      }

      const result = await authClient.signIn.magicLink({
        email,
        callbackURL: "/chat",
      });

      if (result.error) {
        showError(result.error.message || "Failed to send magic link");
        return;
      }

      setMagicLinkSent(true);
    } catch {
      showError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">D</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your DevLM account
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Tabs
          value={activeMethod}
          onValueChange={handleMethodChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger
              value="password"
              className="flex items-center gap-1.5 text-xs sm:text-sm"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Password</span>
            </TabsTrigger>
            <TabsTrigger
              value="otp"
              className="flex items-center gap-1.5 text-xs sm:text-sm"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>OTP</span>
            </TabsTrigger>
            <TabsTrigger
              value="magic-link"
              className="flex items-center gap-1.5 text-xs sm:text-sm"
            >
              <Link2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Magic Link</span>
              <span className="sm:hidden">Link</span>
            </TabsTrigger>
          </TabsList>

          {/* Password */}
          <TabsContent value="password" className="mt-0">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-password">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email-password"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9"
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
            </form>
          </TabsContent>

          {/* OTP */}
          <TabsContent value="otp" className="mt-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-otp">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email-otp"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    disabled={isLoading || otpSent}
                  />
                </div>
              </div>

              {otpSent && (
                <div className="space-y-2">
                  <Label htmlFor="otp">6-digit OTP</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      className="pl-9 text-center text-lg tracking-widest"
                      maxLength={6}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {otpSent ? (
                <>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={handleVerifyOtp}
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify OTP & Sign In"
                    )}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                        clearError();
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      Change email or resend OTP
                    </button>
                  </div>
                </>
              ) : (
                <Button
                  type="button"
                  className="w-full"
                  onClick={handleSendOtp}
                  disabled={isLoading || !email}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Send OTP
                    </>
                  )}
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Magic Link */}
          <TabsContent value="magic-link" className="mt-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-magic">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email-magic"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    disabled={isLoading || magicLinkSent}
                  />
                </div>
              </div>

              {magicLinkSent ? (
                <div className="text-center space-y-4 py-4">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Check your email!</h3>
                    <p className="text-sm text-muted-foreground">
                      We sent a magic link to <strong>{email}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMagicLinkSent(false);
                      clearError();
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={handleMagicLink}
                    disabled={isLoading || !email}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending link...
                      </>
                    ) : (
                      <>
                        <Link2 className="mr-2 h-4 w-4" />
                        Send Magic Link
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    We&apos;ll send a secure sign-in link to your email
                  </p>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

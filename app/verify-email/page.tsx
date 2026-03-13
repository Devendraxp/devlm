"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MailCheck, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const callbackURL = searchParams.get("callbackURL") || "/chat";
  
  const [status, setStatus] = useState<"loading" | "success" | "error" | "pending">("pending");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // If we have a token, attempt to verify it immediately
    if (token) {
      setStatus("loading");
      verifyToken(token);
    } else {
      // If no token, check session storage for email (from login redirect)
      const storedEmail = sessionStorage.getItem("verifyEmail");
      if (storedEmail) {
        setEmail(storedEmail);
        setStatus("pending");
      } else {
        // If no token and no stored email, redirect to login
        // But maybe the user just navigated here manually?
        // Let's show a generic "Check your email" message
        setStatus("pending");
      }
    }
  }, [token]);

  const verifyToken = async (token: string) => {
    try {
      const { data, error } = await authClient.verifyEmail({
        query: {
          token,
          callbackURL,
        },
      });

      if (error) {
        setStatus("error");
        setMessage(error.message || "Verification failed");
        toast.error(error.message || "Verification failed");
      } else {
        setStatus("success");
        setMessage("Email verified successfully!");
        toast.success("Email verified successfully");
        // Redirect after a short delay
        setTimeout(() => {
          router.push(callbackURL);
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("An unexpected error occurred during verification");
      toast.error("An unexpected error occurred");
    }
  };

  const handleResend = async () => {
    if (!email) return;

    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL,
      });
      toast.success("Verification email sent!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send verification email");
    }
  };

  if (status === "loading") {
    return (
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <CardTitle>Verifying Email</CardTitle>
          <CardDescription>
            Please wait while we verify your email address...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle>Email Verified!</CardTitle>
          <CardDescription>
            Your email has been successfully verified. Redirecting you...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button variant="outline" className="w-full" asChild>
            <Link href={callbackURL}>
              Continue to App
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="w-full max-w-md mx-4 border-destructive/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-destructive">Verification Failed</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" asChild>
            <Link href="/login">Back to Login</Link>
          </Button>
          {email && (
            <Button variant="outline" className="w-full" onClick={handleResend}>
              Resend Verification Email
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Pending status - user redirected here or manually navigated
  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <MailCheck className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          {email 
            ? `We've sent a verification link to ${email}.`
            : "Please check your email for a verification link."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Click the link in the email to verify your account and access all features.
          If you don't see the email, check your spam folder.
        </p>
        
        {email && (
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleResend}
          >
            Resend Verification Email
          </Button>
        )}
        
        <div className="border-t pt-4 mt-4">
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/login">Back to Login</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <CardTitle className="mt-4">Loading...</CardTitle>
          </CardHeader>
        </Card>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}

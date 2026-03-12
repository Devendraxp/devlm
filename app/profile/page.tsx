"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Shield,
  Mail,
  Calendar,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  Globe,
  LogOut,
} from "lucide-react";

interface SessionItem {
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  expiresAt?: string | Date;
}

function parseDevice(ua?: string | null) {
  if (!ua) return { type: "desktop" as const, browser: "Unknown browser", os: "Unknown" };
  const isMobile = /mobile|android|iphone|ipad/i.test(ua);
  let browser = "Unknown browser";
  if (/firefox/i.test(ua)) browser = "Firefox";
  else if (/edg/i.test(ua)) browser = "Edge";
  else if (/chrome/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua)) browser = "Safari";
  else if (/opera|opr/i.test(ua)) browser = "Opera";

  let os = "Unknown";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/mac os/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad/i.test(ua)) os = "iOS";

  return { type: isMobile ? ("mobile" as const) : ("desktop" as const), browser, os };
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await authClient.listSessions();
      setSessions((res.data as SessionItem[] | undefined) ?? []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) fetchSessions();
  }, [session?.user, fetchSessions]);

  if (isPending) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) {
    router.push("/login");
    return null;
  }

  const user = session.user;
  const userRole = (user as { role?: string }).role || "user";
  const currentToken = (session.session as { token?: string })?.token;

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    await authClient.updateUser({ name: name.trim() });
    setSavingName(false);
    setEditingName(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    setPasswordLoading(true);

    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    });

    setPasswordLoading(false);

    if (error) {
      setPasswordError(error.message || "Failed to change password.");
    } else {
      setPasswordMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
        },
      },
    });
  };

  const handleRevokeSession = async (token: string) => {
    if (token === currentToken) {
      handleSignOut();
      return;
    }
    setRevokingToken(token);
    try {
      await authClient.revokeSession({ token });
      setSessions((prev) => prev.filter((s) => s.token !== token));
    } catch {
      // ignore
    } finally {
      setRevokingToken(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Profile header */}
      <div className="flex flex-col items-center text-center">
        <Avatar size="lg" className="ring-4 ring-background shadow-lg">
          {user.image && (
            <AvatarImage src={user.image} alt={user.name} />
          )}
          <AvatarFallback className="text-2xl font-semibold">
            {user.name?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="mt-4">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="max-w-xs text-center"
              />
              <Button size="sm" onClick={handleSaveName} disabled={savingName}>
                {savingName ? <Loader2 className="size-4 animate-spin" /> : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2">
                <h1 className="font-heading text-2xl font-bold">{user.name}</h1>
                <Badge variant={userRole === "admin" ? "default" : "secondary"} className="text-[10px]">
                  {userRole === "admin" && <Shield className="mr-1 size-3" />}
                  {userRole}
                </Badge>
              </div>
              <button
                onClick={() => {
                  setName(user.name || "");
                  setEditingName(true);
                }}
                className="mt-0.5 text-xs text-primary hover:underline"
              >
                Edit name
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-5">
        {/* Account Details Card */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            <div className="flex items-center gap-3 border-t border-border px-6 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Mail className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="truncate text-sm font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-border px-6 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Calendar className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="text-sm font-medium">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            {!changingPassword ? (
              <Button variant="outline" size="sm" onClick={() => setChangingPassword(true)}>
                Change Password
              </Button>
            ) : (
              <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                {passwordError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {passwordError}
                  </div>
                )}
                {passwordMessage && (
                  <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                    {passwordMessage}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative max-w-sm">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative max-w-sm">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      maxLength={128}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" size="sm" disabled={passwordLoading}>
                    {passwordLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Update Password
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setChangingPassword(false);
                      setPasswordError("");
                      setPasswordMessage("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Active Sessions Card */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Active Sessions</CardTitle>
                <CardDescription>Devices currently logged into your account</CardDescription>
              </div>
              <Button variant="destructive" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-1.5 size-3.5" />
                Sign Out
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {sessionsLoading ? (
              <div className="flex items-center justify-center border-t border-border py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="border-t border-border px-6 py-6 text-center text-sm text-muted-foreground">
                No active sessions found
              </div>
            ) : (
              sessions.map((s) => {
                const device = parseDevice(s.userAgent);
                const isCurrent = s.token === currentToken;
                return (
                  <div
                    key={s.token}
                    className="flex items-center gap-3 border-t border-border px-6 py-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {device.type === "mobile" ? (
                        <Smartphone className="size-4 text-muted-foreground" />
                      ) : (
                        <Monitor className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {device.browser} on {device.os}
                        </p>
                        {isCurrent && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            This device
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {s.ipAddress && (
                          <>
                            <Globe className="size-3" />
                            <span>{s.ipAddress}</span>
                            <span className="text-border">·</span>
                          </>
                        )}
                        <span>
                          Last active{" "}
                          {s.updatedAt
                            ? new Date(s.updatedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant={isCurrent ? "destructive" : "outline"}
                      size="sm"
                      className="shrink-0 text-xs"
                      disabled={revokingToken === s.token}
                      onClick={() => handleRevokeSession(s.token)}
                    >
                      {revokingToken === s.token ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <>
                          <LogOut className="mr-1 size-3" />
                          {isCurrent ? "Sign Out" : "Revoke"}
                        </>
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Search,
  MoreHorizontal,
  Shield,
  ShieldOff,
  Ban,
  CheckCircle,
  Trash2,
  UserPlus,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: number | null;
  emailVerified: boolean;
  createdAt: Date;
}

const PAGE_SIZE = 10;

export default function AdminPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("user");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Ban dialog
  const [banDialogUser, setBanDialogUser] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banLoading, setBanLoading] = useState(false);

  // Delete dialog
  const [deleteDialogUser, setDeleteDialogUser] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [actionMessage, setActionMessage] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await authClient.admin.listUsers({
        query: {
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          ...(searchQuery
            ? {
                searchValue: searchQuery,
                searchField: "email" as const,
                searchOperator: "contains" as const,
              }
            : {}),
          sortBy: "createdAt",
          sortDirection: "desc" as const,
        },
      });

      if (data) {
        setUsers((data.users as unknown as AdminUser[]) || []);
        setTotal(data.total || 0);
      }
    } catch {
      // handle silently
    }
    setLoading(false);
  }, [page, searchQuery]);

  useEffect(() => {
    if (session?.user && (session.user as { role?: string }).role === "admin") {
      fetchUsers();
    }
  }, [session, fetchUsers]);

  if (sessionPending) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    router.push("/");
    return null;
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);

    const { error } = await authClient.admin.createUser({
      email: createEmail,
      password: createPassword,
      name: createName,
      role: createRole as "user" | "admin",
    });

    setCreateLoading(false);

    if (error) {
      setCreateError(error.message || "Failed to create user.");
      return;
    }

    setCreateOpen(false);
    setCreateName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateRole("user");
    showMessage("User created successfully");
    fetchUsers();
  };

  const handleSetRole = async (userId: string, role: "user" | "admin") => {
    await authClient.admin.setRole({ userId, role });
    showMessage(`Role updated to ${role}`);
    fetchUsers();
  };

  const handleBanUser = async () => {
    if (!banDialogUser) return;
    setBanLoading(true);
    await authClient.admin.banUser({
      userId: banDialogUser.id,
      banReason: banReason || undefined,
    });
    setBanLoading(false);
    setBanDialogUser(null);
    setBanReason("");
    showMessage("User banned");
    fetchUsers();
  };

  const handleUnbanUser = async (userId: string) => {
    await authClient.admin.unbanUser({ userId });
    showMessage("User unbanned");
    fetchUsers();
  };

  const handleDeleteUser = async () => {
    if (!deleteDialogUser) return;
    setDeleteLoading(true);
    await authClient.admin.removeUser({ userId: deleteDialogUser.id });
    setDeleteLoading(false);
    setDeleteDialogUser(null);
    showMessage("User deleted");
    fetchUsers();
  };

  function showMessage(msg: string) {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(""), 3000);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold">
            <Shield className="size-6 text-primary" />
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage users and system settings
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 size-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              {createError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {createError}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="create-password">Password</Label>
                <div className="relative">
                  <Input
                    id="create-password"
                    type={showCreatePassword ? "text" : "password"}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    maxLength={128}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showCreatePassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="create-role">Role</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={createRole === "user" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCreateRole("user")}
                  >
                    User
                  </Button>
                  <Button
                    type="button"
                    variant={createRole === "admin" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCreateRole("admin")}
                  >
                    Admin
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={createLoading}>
                  {createLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Action message */}
      {actionMessage && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {actionMessage}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                {total} user{total !== 1 ? "s" : ""} total
              </CardDescription>
            </div>
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-9"
                />
              </div>
              <Button type="submit" variant="outline" size="sm">
                Search
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No users found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar size="sm">
                              {user.image && (
                                <AvatarImage src={user.image} alt={user.name} />
                              )}
                              <AvatarFallback>
                                {user.name?.charAt(0).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.role === "admin" ? "default" : "secondary"}
                          >
                            {user.role === "admin" && (
                              <Shield className="mr-1 size-3" />
                            )}
                            {user.role || "user"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.banned ? (
                            <Badge variant="destructive">
                              <Ban className="mr-1 size-3" />
                              Banned
                            </Badge>
                          ) : user.emailVerified ? (
                            <Badge variant="secondary" className="text-primary">
                              <CheckCircle className="mr-1 size-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Unverified</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.createdAt as unknown as string).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {user.role !== "admin" ? (
                                <DropdownMenuItem
                                  onClick={() => handleSetRole(user.id, "admin")}
                                >
                                  <Shield className="mr-2 size-4" />
                                  Make Admin
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleSetRole(user.id, "user")}
                                >
                                  <ShieldOff className="mr-2 size-4" />
                                  Remove Admin
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {user.banned ? (
                                <DropdownMenuItem
                                  onClick={() => handleUnbanUser(user.id)}
                                >
                                  <CheckCircle className="mr-2 size-4" />
                                  Unban User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => setBanDialogUser(user)}
                                >
                                  <Ban className="mr-2 size-4" />
                                  Ban User
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteDialogUser(user)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 size-4" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                      >
                        <ChevronLeft className="mr-1 size-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages}
                      >
                        Next
                        <ChevronRight className="ml-1 size-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Ban User Dialog */}
      <Dialog
        open={!!banDialogUser}
        onOpenChange={(open) => !open && setBanDialogUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Ban <strong>{banDialogUser?.name}</strong> ({banDialogUser?.email})?
              This will revoke all their sessions and prevent sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ban-reason">Ban Reason (optional)</Label>
            <Input
              id="ban-reason"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Reason for banning..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogUser(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBanUser}
              disabled={banLoading}
            >
              {banLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog
        open={!!deleteDialogUser}
        onOpenChange={(open) => !open && setDeleteDialogUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{deleteDialogUser?.name}</strong> ({deleteDialogUser?.email})?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogUser(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

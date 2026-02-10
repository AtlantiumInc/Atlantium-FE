import { useState, useEffect } from "react";
import {
  Search,
  MoreHorizontal,
  Shield,
  ShieldOff,
  Users,
  Mail,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  display_name?: string;
  is_admin: boolean;
  is_email_verified: boolean;
  has_access: boolean;
  created_at: string;
  last_login?: string;
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [toggleAdminConfirm, setToggleAdminConfirm] = useState<User | null>(null);
  const [toggleAccessConfirm, setToggleAccessConfirm] = useState<User | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAllUsers();
      setUsers(data);
    } catch (error) {
      toast.error("Failed to load users");
      console.error("Error loading users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleToggleAdmin = async (user: User) => {
    if (!toggleAdminConfirm) return;
    setIsUpdating(true);
    try {
      await api.updateUserAdmin(user.id, !user.is_admin);
      setUsers(users.map((u) =>
        u.id === user.id ? { ...u, is_admin: !u.is_admin } : u
      ));
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...selectedUser, is_admin: !user.is_admin });
      }
      toast.success(`Admin status ${!user.is_admin ? "granted" : "removed"}`);
      setToggleAdminConfirm(null);
    } catch (error) {
      toast.error("Failed to update admin status");
      console.error("Error:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleAccess = async (user: User) => {
    if (!toggleAccessConfirm) return;
    setIsUpdating(true);
    try {
      await api.updateUserAccess(user.id, !user.has_access);
      setUsers(users.map((u) =>
        u.id === user.id ? { ...u, has_access: !u.has_access } : u
      ));
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...selectedUser, has_access: !user.has_access });
      }
      toast.success(`Access ${!user.has_access ? "granted" : "revoked"}`);
      setToggleAccessConfirm(null);
    } catch (error) {
      toast.error("Failed to update access status");
      console.error("Error:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Users</h2>
          <p className="text-muted-foreground">Manage user accounts, permissions, and access</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {users.length} total users
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.display_name || "No name"}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.is_email_verified ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.has_access ? (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Granted
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-500 border-orange-500/50 gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_admin ? (
                        <Badge className="bg-primary">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline">User</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>{formatDateTime(user.last_login)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setToggleAccessConfirm(user)}>
                            {user.has_access ? (
                              <>
                                <Clock className="h-4 w-4 mr-2" />
                                Revoke Access
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Grant Access
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setToggleAdminConfirm(user)}>
                            {user.is_admin ? (
                              <>
                                <ShieldOff className="h-4 w-4 mr-2" />
                                Remove Admin
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-2" />
                                Make Admin
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Display Name</Label>
                  <p className="font-medium">{selectedUser.display_name || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">{formatDate(selectedUser.created_at)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Login</Label>
                  <p className="font-medium">{formatDateTime(selectedUser.last_login)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-t">
                <div>
                  <Label>Email Verified</Label>
                  <p className="text-sm text-muted-foreground">
                    User has verified their email address
                  </p>
                </div>
                <Switch checked={selectedUser.is_email_verified} disabled />
              </div>
              <div className="flex items-center justify-between py-2 border-t">
                <div>
                  <Label>Dashboard Access</Label>
                  <p className="text-sm text-muted-foreground">
                    User can access the dashboard and features
                  </p>
                </div>
                <Switch
                  checked={selectedUser.has_access}
                  onCheckedChange={() => setToggleAccessConfirm(selectedUser)}
                />
              </div>
              <div className="flex items-center justify-between py-2 border-t">
                <div>
                  <Label>Admin Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Grant admin access to this user
                  </p>
                </div>
                <Switch
                  checked={selectedUser.is_admin}
                  onCheckedChange={() => setToggleAdminConfirm(selectedUser)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Access Confirmation Dialog */}
      <Dialog open={!!toggleAccessConfirm} onOpenChange={() => setToggleAccessConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {toggleAccessConfirm?.has_access ? "Revoke Access" : "Grant Access"}
            </DialogTitle>
            <DialogDescription>
              {toggleAccessConfirm?.has_access
                ? `Are you sure you want to revoke dashboard access from ${toggleAccessConfirm?.email}? They will see the pending approval overlay.`
                : `Are you sure you want to grant dashboard access to ${toggleAccessConfirm?.email}? They will be able to use all features immediately.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleAccessConfirm(null)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              variant={toggleAccessConfirm?.has_access ? "destructive" : "default"}
              onClick={() => toggleAccessConfirm && handleToggleAccess(toggleAccessConfirm)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : toggleAccessConfirm?.has_access ? (
                "Revoke Access"
              ) : (
                "Grant Access"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Admin Confirmation Dialog */}
      <Dialog open={!!toggleAdminConfirm} onOpenChange={() => setToggleAdminConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {toggleAdminConfirm?.is_admin ? "Remove Admin Access" : "Grant Admin Access"}
            </DialogTitle>
            <DialogDescription>
              {toggleAdminConfirm?.is_admin
                ? `Are you sure you want to remove admin access from ${toggleAdminConfirm?.email}?`
                : `Are you sure you want to grant admin access to ${toggleAdminConfirm?.email}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleAdminConfirm(null)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              variant={toggleAdminConfirm?.is_admin ? "destructive" : "default"}
              onClick={() => toggleAdminConfirm && handleToggleAdmin(toggleAdminConfirm)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : toggleAdminConfirm?.is_admin ? (
                "Remove Admin"
              ) : (
                "Grant Admin"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

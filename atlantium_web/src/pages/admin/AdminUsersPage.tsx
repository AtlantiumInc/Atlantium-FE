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
  Phone,
  Globe,
  Target,
  Sparkles,
  Code,
  Heart,
  Timer,
  MapPin,
  FileText,
  Calendar,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  getOptionLabel,
  PRIMARY_GOAL_OPTIONS,
  INTERESTS_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  TECHNICAL_LEVEL_OPTIONS,
  COMMUNITY_HOPES_OPTIONS,
  TIME_COMMITMENT_OPTIONS,
  TIMEZONE_OPTIONS,
} from "@/lib/onboarding-options";
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
  const [userProfile, setUserProfile] = useState<Awaited<ReturnType<typeof api.getAdminUserProfile>> | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

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

  const handleViewDetails = async (user: User) => {
    setSelectedUser(user);
    setUserProfile(null);
    setIsLoadingProfile(true);
    try {
      const profile = await api.getAdminUserProfile(user.id);
      setUserProfile(profile);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoadingProfile(false);
    }
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
                          <DropdownMenuItem onClick={() => handleViewDetails(user)}>
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
      <Dialog open={!!selectedUser} onOpenChange={() => { setSelectedUser(null); setUserProfile(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {userProfile?.avatar_url && (
                <img src={userProfile.avatar_url} alt="" className="h-8 w-8 rounded-full" />
              )}
              {selectedUser?.display_name || selectedUser?.email}
            </DialogTitle>
            <DialogDescription>
              User profile and registration details
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-5 py-2">
                {/* Account Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {selectedUser.email}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Display Name</Label>
                    <p className="text-sm font-medium">{selectedUser.display_name || "-"}</p>
                  </div>
                  {userProfile && (
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground">Full Name</Label>
                        <p className="text-sm font-medium">
                          {[userProfile.first_name, userProfile.last_name].filter(Boolean).join(" ") || "-"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Username</Label>
                        <p className="text-sm font-medium">{userProfile.username || "-"}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">Created</Label>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatDate(selectedUser.created_at)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Last Login</Label>
                    <p className="text-sm font-medium">{formatDateTime(selectedUser.last_login)}</p>
                  </div>
                </div>

                {/* Toggles */}
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Email Verified</Label>
                    </div>
                    <Switch checked={selectedUser.is_email_verified} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Dashboard Access</Label>
                    </div>
                    <Switch
                      checked={selectedUser.has_access}
                      onCheckedChange={() => setToggleAccessConfirm(selectedUser)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Admin Status</Label>
                    </div>
                    <Switch
                      checked={selectedUser.is_admin}
                      onCheckedChange={() => setToggleAdminConfirm(selectedUser)}
                    />
                  </div>
                </div>

                {/* Registration Details */}
                <Separator />
                {isLoadingProfile ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : userProfile?.registration_details ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground tracking-wider uppercase">
                      Registration Form
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Phone */}
                      {userProfile.registration_details.phone_number && (
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> Phone
                          </Label>
                          <p className="text-sm font-medium">{userProfile.registration_details.phone_number}</p>
                        </div>
                      )}

                      {/* Timezone */}
                      {userProfile.registration_details.timezone && (
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Globe className="h-3 w-3" /> Timezone
                          </Label>
                          <p className="text-sm font-medium">
                            {getOptionLabel(TIMEZONE_OPTIONS, userProfile.registration_details.timezone)}
                          </p>
                        </div>
                      )}

                      {/* Georgia Resident */}
                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Georgia Resident
                        </Label>
                        <p className="text-sm font-medium">
                          {userProfile.registration_details.is_georgia_resident ? "Yes" : "No"}
                        </p>
                      </div>

                      {/* Primary Goal */}
                      {userProfile.registration_details.primary_goal && (
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Target className="h-3 w-3" /> Primary Goal
                          </Label>
                          <p className="text-sm font-medium">
                            {getOptionLabel(PRIMARY_GOAL_OPTIONS, userProfile.registration_details.primary_goal)}
                          </p>
                        </div>
                      )}

                      {/* Technical Level */}
                      {userProfile.registration_details.technical_level && (
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Code className="h-3 w-3" /> Technical Level
                          </Label>
                          <p className="text-sm font-medium">
                            {getOptionLabel(TECHNICAL_LEVEL_OPTIONS, userProfile.registration_details.technical_level)}
                          </p>
                        </div>
                      )}

                      {/* Time Commitment */}
                      {userProfile.registration_details.time_commitment && (
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Timer className="h-3 w-3" /> Time Commitment
                          </Label>
                          <p className="text-sm font-medium">
                            {getOptionLabel(TIME_COMMITMENT_OPTIONS, userProfile.registration_details.time_commitment)}
                          </p>
                        </div>
                      )}

                      {/* Project Status */}
                      {userProfile.registration_details.working_on_project && (
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3" /> Project Status
                          </Label>
                          <p className="text-sm font-medium">
                            {getOptionLabel(PROJECT_STATUS_OPTIONS, userProfile.registration_details.working_on_project)}
                          </p>
                        </div>
                      )}

                      {/* Membership Tier */}
                      {userProfile.registration_details.membership_tier && (
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Membership Tier
                          </Label>
                          <Badge variant="secondary" className="mt-0.5">
                            {userProfile.registration_details.membership_tier === "club" ? "Club" :
                             userProfile.registration_details.membership_tier === "club_annual" ? "Club (Annual)" : "Free"}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Interests - full width */}
                    {userProfile.registration_details.interests && userProfile.registration_details.interests.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                          <Sparkles className="h-3 w-3" /> Interests
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {userProfile.registration_details.interests.map((interest) => (
                            <Badge key={interest} variant="outline" className="text-xs">
                              {getOptionLabel(INTERESTS_OPTIONS, interest)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Community Hopes - full width */}
                    {userProfile.registration_details.community_hopes && userProfile.registration_details.community_hopes.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                          <Heart className="h-3 w-3" /> Community Hopes
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {userProfile.registration_details.community_hopes.map((hope) => (
                            <Badge key={hope} variant="outline" className="text-xs">
                              {getOptionLabel(COMMUNITY_HOPES_OPTIONS, hope)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Project Description */}
                    {userProfile.registration_details.project_description && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Project Description</Label>
                        <p className="text-sm mt-1 p-3 rounded-md bg-muted/50 border">
                          {userProfile.registration_details.project_description}
                        </p>
                      </div>
                    )}

                    {/* Success Definition */}
                    {userProfile.registration_details.success_definition && (
                      <div>
                        <Label className="text-xs text-muted-foreground">How They Define Success</Label>
                        <p className="text-sm mt-1 p-3 rounded-md bg-muted/50 border italic">
                          "{userProfile.registration_details.success_definition}"
                        </p>
                      </div>
                    )}

                    {/* Onboarding Completed At */}
                    {userProfile.registration_details.onboarding_completed_at && (
                      <p className="text-xs text-muted-foreground">
                        Onboarding completed {formatDate(userProfile.registration_details.onboarding_completed_at)}
                      </p>
                    )}
                  </div>
                ) : !isLoadingProfile && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No registration details found
                  </p>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedUser(null); setUserProfile(null); }}>
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

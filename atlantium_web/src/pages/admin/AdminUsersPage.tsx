import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  MoreHorizontal,
  Shield,
  ShieldOff,
  Users,
  Mail,
  CheckCircle2,
  Clock,
  ClipboardCheck,
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
  ArrowUp,
  ArrowDown,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  display_name?: string;
  full_name?: string;
  is_admin: boolean;
  is_email_verified: boolean;
  has_access: boolean;
  onboarding_completed: boolean;
  created_at: string;
  last_login?: string;
}

function getUserName(user: User) {
  return user.display_name || user.full_name || user.email.split("@")[0];
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
  const [emailUser, setEmailUser] = useState<User | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const buildEmailHtml = (name: string, subject: string, body: string) => {
    const escapedBody = body.replace(/\n/g, "<br/>");
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="padding:32px 40px 24px 40px;">
<img src="https://atlantium.ai/logo-dark.png" alt="Atlantium" width="140" style="display:block;margin-bottom:24px;">
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#18181b;">Hi ${name},</p>
<div style="font-size:15px;line-height:1.7;color:#27272a;">${escapedBody}</div>
</td></tr>
<tr><td style="padding:0 40px 32px 40px;">
<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa;">Atlantium &mdash; AI Engineering Community</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  };

  const handleSendEmail = async () => {
    if (!emailUser || !emailSubject.trim() || !emailBody.trim()) return;
    setIsSendingEmail(true);
    try {
      const name = emailUser.display_name || "there";
      const htmlBody = buildEmailHtml(name, emailSubject, emailBody);
      await api.sendUserEmail(emailUser.id, emailSubject, htmlBody);
      toast.success(`Email sent to ${emailUser.email}`);
      setEmailUser(null);
      setEmailSubject("");
      setEmailBody("");
    } catch (error) {
      toast.error("Failed to send email");
      console.error("Error sending email:", error);
    } finally {
      setIsSendingEmail(false);
    }
  };

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

  const filteredUsers = users
    .filter((user) => {
      const q = searchQuery.toLowerCase();
      return (
        user.email.toLowerCase().includes(q) ||
        user.display_name?.toLowerCase().includes(q) ||
        user.full_name?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortAsc ? cmp : -cmp;
    });

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

  const handleSelectUser = useCallback(async (user: User) => {
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
  }, []);

  const handleToggleAdmin = async (user: User) => {
    if (!toggleAdminConfirm) return;
    setIsUpdating(true);
    try {
      await api.updateUserAdmin(user.id, !user.is_admin);
      const updated = users.map((u) =>
        u.id === user.id ? { ...u, is_admin: !u.is_admin } : u
      );
      setUsers(updated);
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
      const updated = users.map((u) =>
        u.id === user.id ? { ...u, has_access: !u.has_access } : u
      );
      setUsers(updated);
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

  const navigateList = useCallback((direction: "up" | "down") => {
    if (filteredUsers.length === 0) return;
    const currentIndex = selectedUser
      ? filteredUsers.findIndex((u) => u.id === selectedUser.id)
      : -1;
    let nextIndex: number;
    if (direction === "down") {
      nextIndex = currentIndex < filteredUsers.length - 1 ? currentIndex + 1 : 0;
    } else {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : filteredUsers.length - 1;
    }
    const nextUser = filteredUsers[nextIndex];
    handleSelectUser(nextUser);
    // Scroll the item into view
    const el = itemRefs.current.get(nextUser.id);
    el?.scrollIntoView({ block: "nearest" });
  }, [filteredUsers, selectedUser, handleSelectUser]);

  const handleListKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      navigateList("down");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      navigateList("up");
    }
  }, [navigateList]);

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Users</h2>
          <p className="text-muted-foreground">Manage user accounts, permissions, and access</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {users.length} total users
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* Left Panel - User List */}
        <div
          className="w-80 flex-shrink-0 border rounded-lg flex flex-col bg-card overflow-hidden"
          onKeyDown={handleListKeyDown}
          ref={listRef}
        >
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <div className="flex items-center justify-between mt-2 px-0.5">
              <span className="text-xs text-muted-foreground">{filteredUsers.length} users</span>
              <button
                onClick={() => setSortAsc(!sortAsc)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {sortAsc ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                {sortAsc ? "Oldest" : "Newest"}
              </button>
            </div>
          </div>

          {/* User List */}
          <ScrollArea className="flex-1 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="p-1.5">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(user.id, el);
                      else itemRefs.current.delete(user.id);
                    }}
                    onClick={() => handleSelectUser(user)}
                    className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                      selectedUser?.id === user.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">
                        {getUserName(user)}
                      </span>
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        {user.onboarding_completed ? (
                          <ClipboardCheck className="h-3 w-3 text-blue-500" />
                        ) : (
                          <Clock className="h-3 w-3 text-muted-foreground/40" />
                        )}
                        {user.has_access ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Clock className="h-3 w-3 text-orange-500" />
                        )}
                        {user.is_admin && (
                          <Shield className="h-3 w-3 text-primary" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No users found</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - User Detail */}
        <div className="flex-1 border rounded-lg bg-card overflow-hidden min-h-0">
          {selectedUser ? (
            <ScrollArea className="h-full">
              <div className="p-6">
                {/* User Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    {userProfile?.avatar_url ? (
                      <img src={userProfile.avatar_url} alt="" className="h-12 w-12 rounded-full" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold">
                        {getUserName(selectedUser)}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {selectedUser.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEmailUser(selectedUser);
                        setEmailSubject("");
                        setEmailBody("");
                      }}
                      title="Send email"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setToggleAccessConfirm(selectedUser)}>
                          {selectedUser.has_access ? (
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
                        <DropdownMenuItem onClick={() => setToggleAdminConfirm(selectedUser)}>
                          {selectedUser.is_admin ? (
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
                  </div>
                </div>

                {/* Account Info */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedUser.is_email_verified ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
                      Email Pending
                    </Badge>
                  )}
                  {selectedUser.has_access ? (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Access Granted
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-500 border-orange-500/50 gap-1">
                      <Clock className="h-3 w-3" />
                      Access Pending
                    </Badge>
                  )}
                  {selectedUser.onboarding_completed ? (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 gap-1">
                      <ClipboardCheck className="h-3 w-3" />
                      Form Done
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 gap-1">
                      <Clock className="h-3 w-3" />
                      Form Incomplete
                    </Badge>
                  )}
                  {selectedUser.is_admin && (
                    <Badge className="bg-primary gap-1">
                      <Shield className="h-3 w-3" />
                      Admin
                    </Badge>
                  )}
                </div>

                {/* Toggles */}
                <Separator className="mb-4" />
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Email Verified</Label>
                    <Switch checked={selectedUser.is_email_verified} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Dashboard Access</Label>
                    <Switch
                      checked={selectedUser.has_access}
                      onCheckedChange={() => setToggleAccessConfirm(selectedUser)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Admin Status</Label>
                    <Switch
                      checked={selectedUser.is_admin}
                      onCheckedChange={() => setToggleAdminConfirm(selectedUser)}
                    />
                  </div>
                </div>

                {/* Registration Details */}
                <Separator className="mb-4" />
                {isLoadingProfile ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : userProfile?.registration_details ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground tracking-wider uppercase">
                      Registration Form
                    </h3>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {userProfile.registration_details.phone_number && (
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> Phone
                          </Label>
                          <p className="text-sm font-medium">{userProfile.registration_details.phone_number}</p>
                        </div>
                      )}

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

                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Georgia Resident
                        </Label>
                        <p className="text-sm font-medium">
                          {userProfile.registration_details.is_georgia_resident ? "Yes" : "No"}
                        </p>
                      </div>

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

                    {userProfile.registration_details.project_description && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Project Description</Label>
                        <p className="text-sm mt-1 p-3 rounded-md bg-muted/50 border">
                          {userProfile.registration_details.project_description}
                        </p>
                      </div>
                    )}

                    {userProfile.registration_details.success_definition && (
                      <div>
                        <Label className="text-xs text-muted-foreground">How They Define Success</Label>
                        <p className="text-sm mt-1 p-3 rounded-md bg-muted/50 border italic">
                          "{userProfile.registration_details.success_definition}"
                        </p>
                      </div>
                    )}

                    {userProfile.registration_details.onboarding_completed_at && (
                      <p className="text-xs text-muted-foreground">
                        Onboarding completed {formatDate(userProfile.registration_details.onboarding_completed_at)}
                      </p>
                    )}
                  </div>
                ) : !isLoadingProfile && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No registration details found
                  </p>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a user to view details</p>
                <p className="text-xs mt-1 opacity-60">Use arrow keys to navigate</p>
              </div>
            </div>
          )}
        </div>
      </div>

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

      {/* Email Bottom Sheet */}
      <Sheet open={!!emailUser} onOpenChange={(open) => { if (!open) setEmailUser(null); }}>
        <SheetContent side="bottom" className="max-h-[80vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send Email
            </SheetTitle>
            <SheetDescription>
              To: {emailUser?.display_name ? `${emailUser.display_name} (${emailUser.email})` : emailUser?.email}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                placeholder="Email subject..."
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-body">Message</Label>
              <Textarea
                id="email-body"
                placeholder="Write your message..."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Sent from: Atlantium &lt;team@notifications.atlantium.ai&gt;
              </p>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setEmailUser(null)} disabled={isSendingEmail}>
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !emailSubject.trim() || !emailBody.trim()}
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

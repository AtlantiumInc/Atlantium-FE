import { useState, useEffect } from "react";
import { User, LogOut, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MembershipCard } from "@/components/subscription";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { api } from "@/lib/api";
import type { Profile } from "@/components/ProfileCard";
import type { User as UserType } from "@/lib/api";

interface ProfileDropdownProps {
  user?: UserType | null;
  onLogout?: () => void;
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return "U";
}

export function ProfileDropdown({ user, onLogout }: ProfileDropdownProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data as Profile);
    } catch {
      // Profile might not exist yet
      setProfile(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleProfileUpdate = () => {
    fetchProfile();
    setIsEditOpen(false);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await api.deleteAccount();
      toast.success("Account deleted successfully");
      onLogout?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete account";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  // Use user data from auth, with profile as fallback for display name
  const displayName = user?.display_name || user?.first_name || profile?.display_name || user?.email;
  const avatarUrl = user?.avatar || profile?.avatar_url;
  const initials = getInitials(
    user?.display_name || user?.first_name || profile?.display_name,
    user?.email
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {displayName || "User"}
              </p>
              {user?.email && (
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onLogout}
            className="text-muted-foreground focus:text-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Profile</SheetTitle>
            <SheetDescription>
              Manage your profile information and membership.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6 px-4">
            {/* Membership Card */}
            <MembershipCard />

            {/* Profile Edit Form */}
            <div>
              <h3 className="text-sm font-semibold mb-4">Profile Information</h3>
              <ProfileEditForm
                profile={profile || undefined}
                onSuccess={handleProfileUpdate}
                variant="sheet"
              />
            </div>
          </div>

          {/* Delete Account Section */}
          <div className="mt-10 pt-6 pb-4 border-t border-border mx-4">
            <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Permanently delete your account and all associated data.
            </p>
            <Button
              variant="destructive"
              className="mt-4"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Account Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

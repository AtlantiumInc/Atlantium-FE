import { useRef, useState } from "react";
import { MapPin, Link as LinkIcon, Calendar, Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  website_url?: string;
  linkedin_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProfileCardProps {
  profile: Profile;
  variant?: "default" | "compact";
  onAvatarClick?: () => void;
  onAvatarUpload?: (url: string) => void;
  editable?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateString?: string): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function ProfileCard({ profile, variant = "default", onAvatarClick, onAvatarUpload, editable = false }: ProfileCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAvatarUpload) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const response = await api.uploadImage(file);
      if (response?.url) {
        onAvatarUpload(response.url);
        toast.success("Avatar uploaded");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (variant === "compact") {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
              <AvatarFallback>{getInitials(profile.display_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{profile.display_name}</p>
              <p className="text-sm text-muted-foreground truncate">@{profile.username}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
      <CardContent className="relative pt-0 pb-6 px-6">
        <div className="relative -mt-10 w-fit group">
          <Avatar className="h-20 w-20 ring-4 ring-background">
            <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
            <AvatarFallback className="text-xl">{getInitials(profile.display_name)}</AvatarFallback>
          </Avatar>

          {onAvatarClick && (
            <button
              type="button"
              onClick={onAvatarClick}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
            >
              <Camera className="h-5 w-5 text-white" />
              <span className="text-[9px] font-medium text-white/90 mt-0.5">Change</span>
            </button>
          )}
        </div>

        {/* Hidden file input for avatar upload */}
        {editable && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        )}

        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <h3 className="text-xl font-semibold">@{profile.username}</h3>
              {(profile.first_name || profile.last_name) && (
                <p className="text-muted-foreground">
                  {[profile.first_name, profile.last_name].filter(Boolean).join(" ")}
                </p>
              )}
            </div>
            {editable && onAvatarUpload && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUploadClick}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Change photo
                  </>
                )}
              </Button>
            )}
          </div>

          {profile.bio && (
            <p className="text-sm leading-relaxed">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {profile.location}
              </span>
            )}
            {profile.website_url && (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <LinkIcon className="h-4 w-4" />
                {profile.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}
            {profile.created_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Joined {formatDate(profile.created_at)}
              </span>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Badge variant="secondary">Member</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

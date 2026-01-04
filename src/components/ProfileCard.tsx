import { MapPin, Link as LinkIcon, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  created_at?: string;
  updated_at?: string;
}

interface ProfileCardProps {
  profile: Profile;
  variant?: "default" | "compact";
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

export function ProfileCard({ profile, variant = "default" }: ProfileCardProps) {
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
        <Avatar className="h-20 w-20 -mt-10 ring-4 ring-background">
          <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
          <AvatarFallback className="text-xl">{getInitials(profile.display_name)}</AvatarFallback>
        </Avatar>

        <div className="mt-3 space-y-3">
          <div>
            <h3 className="text-xl font-semibold">{profile.display_name}</h3>
            <p className="text-muted-foreground">@{profile.username}</p>
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

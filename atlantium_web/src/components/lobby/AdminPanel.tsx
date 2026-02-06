import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MicOff, VideoOff, UserX } from "lucide-react";
import { toast } from "sonner";
import type { LobbyMember } from "@/lib/types";

interface AdminPanelProps {
  members: LobbyMember[];
  currentUserId: string;
}

export function AdminPanel({ members, currentUserId }: AdminPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleMute = async (
    userId: string,
    trackType: "audio" | "video",
    displayName: string
  ) => {
    setLoading(`${userId}-${trackType}`);
    try {
      await api.lobbyAdminAction("mute", userId, trackType);
      toast.success(
        `Muted ${trackType} for ${displayName}`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to mute user");
    } finally {
      setLoading(null);
    }
  };

  const handleKick = async (userId: string, displayName: string) => {
    setLoading(`${userId}-kick`);
    try {
      await api.lobbyAdminAction("kick", userId);
      toast.success(`Kicked ${displayName} from lobby`);
    } catch (err: any) {
      toast.error(err.message || "Failed to kick user");
    } finally {
      setLoading(null);
    }
  };

  const otherMembers = members.filter((m) => m.user_id !== currentUserId);

  if (otherMembers.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        No other participants to manage.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        Admin Controls
      </h3>
      <div className="space-y-1">
        {otherMembers.map((member) => {
          const name = member.display_name || member.username || "User";
          return (
            <div
              key={member.user_id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
            >
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium">
                  {name[0]?.toUpperCase()}
                </div>
              )}
              <span className="text-sm flex-1 truncate">{name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={loading === `${member.user_id}-audio`}
                onClick={() => handleMute(member.user_id, "audio", name)}
                title="Mute audio"
              >
                <MicOff size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={loading === `${member.user_id}-video`}
                onClick={() => handleMute(member.user_id, "video", name)}
                title="Mute video"
              >
                <VideoOff size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                disabled={loading === `${member.user_id}-kick`}
                onClick={() => handleKick(member.user_id, name)}
                title="Kick from lobby"
              >
                <UserX size={14} />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

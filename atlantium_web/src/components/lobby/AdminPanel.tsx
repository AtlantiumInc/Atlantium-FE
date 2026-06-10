import { useMemo, useState } from "react";
import { useParticipants } from "@livekit/components-react";
import { MicOff, Star, UserX, VideoOff, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface AdminPanelProps {
  eventId: string;
  currentUserId: string;
  onSpotlight?: (userId: string | null) => void;
}

export function AdminPanel({ eventId, currentUserId, onSpotlight }: AdminPanelProps) {
  const participants = useParticipants();
  const [loading, setLoading] = useState<string | null>(null);

  const otherParticipants = useMemo(
    () => participants.filter((participant) => participant.identity !== currentUserId),
    [participants, currentUserId]
  );

  const runAction = async (
    key: string,
    action: "mute-all" | "mute-user" | "remove-user" | "spotlight",
    payload: Record<string, unknown>,
    successMessage: string
  ) => {
    setLoading(key);
    try {
      await api.lobbyModeratorAction(eventId, action, payload);
      toast.success(successMessage);
      if (action === "spotlight") onSpotlight?.((payload.target_user_id as string | null) ?? null);
    } catch (err: any) {
      toast.error(err.message || "Moderator action failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Moderator</h3>
          <p className="text-xs text-muted-foreground">Manage the live office-hours room.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={loading === "mute-all"}
          onClick={() => runAction("mute-all", "mute-all", {}, "All microphones muted")}
          className="h-8 gap-2"
        >
          <VolumeX className="h-4 w-4" />
          Mute all
        </Button>
      </div>

      {otherParticipants.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
          No other live participants yet.
        </p>
      ) : (
        <div className="space-y-1">
          {otherParticipants.map((participant) => {
            const name = participant.name || participant.identity;
            return (
              <div
                key={participant.sid}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-xs font-semibold text-cyan-200">
                  {name[0]?.toUpperCase()}
                </div>
                <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-yellow-500 hover:bg-yellow-500/10"
                  disabled={loading === `${participant.identity}-spotlight`}
                  onClick={() => runAction(
                    `${participant.identity}-spotlight`,
                    "spotlight",
                    { target_user_id: participant.identity },
                    `Spotlighted ${name}`
                  )}
                  title="Spotlight presenter"
                >
                  <Star className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={loading === `${participant.identity}-audio`}
                  onClick={() => runAction(
                    `${participant.identity}-audio`,
                    "mute-user",
                    { target_user_id: participant.identity, track_type: "audio" },
                    `Muted ${name}`
                  )}
                  title="Mute microphone"
                >
                  <MicOff className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={loading === `${participant.identity}-video`}
                  onClick={() => runAction(
                    `${participant.identity}-video`,
                    "mute-user",
                    { target_user_id: participant.identity, track_type: "video" },
                    `Muted ${name}'s video`
                  )}
                  title="Mute camera"
                >
                  <VideoOff className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  disabled={loading === `${participant.identity}-remove`}
                  onClick={() => runAction(
                    `${participant.identity}-remove`,
                    "remove-user",
                    { target_user_id: participant.identity },
                    `Removed ${name}`
                  )}
                  title="Remove participant"
                >
                  <UserX className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

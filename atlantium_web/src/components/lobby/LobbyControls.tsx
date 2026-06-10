import { useEffect } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { LogOut, Mic, MicOff, MonitorUp, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface LobbyControlsProps {
  onLeave: () => void;
  canPublish: boolean;
  compact?: boolean;
}

export function LobbyControls({ onLeave, canPublish, compact }: LobbyControlsProps) {
  const { localParticipant } = useLocalParticipant();

  const micEnabled = localParticipant.isMicrophoneEnabled;
  const camEnabled = localParticipant.isCameraEnabled;
  const screenEnabled = localParticipant.isScreenShareEnabled;

  useEffect(() => {
    if (!canPublish) {
      if (localParticipant.isMicrophoneEnabled) void localParticipant.setMicrophoneEnabled(false);
      if (localParticipant.isCameraEnabled) void localParticipant.setCameraEnabled(false);
      if (localParticipant.isScreenShareEnabled) void localParticipant.setScreenShareEnabled(false);
    }
  }, [canPublish, localParticipant]);

  const toggleMic = async () => {
    if (!canPublish) return;
    await localParticipant.setMicrophoneEnabled(!micEnabled);
  };

  const toggleCam = async () => {
    if (!canPublish) return;
    await localParticipant.setCameraEnabled(!camEnabled);
  };

  const toggleScreen = async () => {
    if (!canPublish) return;
    await localParticipant.setScreenShareEnabled(!screenEnabled);
  };

  const disabledTitle = "Watch/listen only for this office-hours session";

  return (
    <div className={cn(
      "flex items-center justify-center gap-2 bg-background",
      compact ? "" : "border-t border-border/60 px-3 py-2"
    )}>
      <Button
        variant={micEnabled ? "secondary" : "destructive"}
        size="icon"
        onClick={toggleMic}
        disabled={!canPublish}
        title={!canPublish ? disabledTitle : micEnabled ? "Mute microphone" : "Unmute microphone"}
        className={cn("h-9 w-9", compact && "h-8 w-8")}
      >
        {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
      </Button>

      <Button
        variant={camEnabled ? "secondary" : "destructive"}
        size="icon"
        onClick={toggleCam}
        disabled={!canPublish}
        title={!canPublish ? disabledTitle : camEnabled ? "Turn off camera" : "Turn on camera"}
        className={cn("h-9 w-9", compact && "h-8 w-8")}
      >
        {camEnabled ? <Video size={16} /> : <VideoOff size={16} />}
      </Button>

      <Button
        variant={screenEnabled ? "secondary" : "outline"}
        size="icon"
        onClick={toggleScreen}
        disabled={!canPublish}
        title={!canPublish ? disabledTitle : screenEnabled ? "Stop screen share" : "Share screen"}
        className={cn("h-9 w-9", compact && "h-8 w-8")}
      >
        <MonitorUp size={16} />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={onLeave}
        title="Leave lobby"
        className={cn("h-9 w-9 text-destructive hover:bg-destructive/10", compact && "h-8 w-8")}
      >
        <LogOut size={16} />
      </Button>
    </div>
  );
}

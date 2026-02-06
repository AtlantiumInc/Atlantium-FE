import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, LogOut } from "lucide-react";

interface LobbyControlsProps {
  onLeave: () => void;
}

export function LobbyControls({ onLeave }: LobbyControlsProps) {
  const { localParticipant } = useLocalParticipant();

  const micEnabled = localParticipant.isMicrophoneEnabled;
  const camEnabled = localParticipant.isCameraEnabled;

  const toggleMic = async () => {
    await localParticipant.setMicrophoneEnabled(!micEnabled);
  };

  const toggleCam = async () => {
    await localParticipant.setCameraEnabled(!camEnabled);
  };

  return (
    <div className="flex items-center justify-center gap-3 py-3 border-t border-border bg-background">
      <Button
        variant={micEnabled ? "secondary" : "destructive"}
        size="icon"
        onClick={toggleMic}
        title={micEnabled ? "Mute microphone" : "Unmute microphone"}
      >
        {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
      </Button>

      <Button
        variant={camEnabled ? "secondary" : "destructive"}
        size="icon"
        onClick={toggleCam}
        title={camEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {camEnabled ? <Video size={18} /> : <VideoOff size={18} />}
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={onLeave}
        title="Leave lobby"
        className="text-destructive hover:bg-destructive/10"
      >
        <LogOut size={18} />
      </Button>
    </div>
  );
}

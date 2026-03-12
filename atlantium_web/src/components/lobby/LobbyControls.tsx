import { useLocalParticipant } from "@livekit/components-react";
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
    <div className="flex items-center justify-center gap-3 py-2 bg-background">
      <Button
        variant={micEnabled ? "secondary" : "destructive"}
        size="icon"
        onClick={toggleMic}
        title={micEnabled ? "Mute microphone" : "Unmute microphone"}
        className="h-9 w-9"
      >
        {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
      </Button>

      <Button
        variant={camEnabled ? "secondary" : "destructive"}
        size="icon"
        onClick={toggleCam}
        title={camEnabled ? "Turn off camera" : "Turn on camera"}
        className="h-9 w-9"
      >
        {camEnabled ? <Video size={16} /> : <VideoOff size={16} />}
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={onLeave}
        title="Leave lobby"
        className="h-9 w-9 text-destructive hover:bg-destructive/10"
      >
        <LogOut size={16} />
      </Button>
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
  AudioTrack,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface GroupLiveRoomProps {
  groupId: string;
  onLeave: () => void;
}

export function GroupLiveRoom({ groupId, onLeave }: GroupLiveRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToken() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.getGroupLivekitToken(groupId);
        setToken(response.token);
        setUrl(response.url);
      } catch (err: any) {
        const errorMsg = err.message || "Failed to join live room";
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    }

    fetchToken();
  }, [groupId]);

  if (isLoading) {
    return (
      <Card className="p-6 h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Connecting to live room...</p>
        </div>
      </Card>
    );
  }

  if (error || !token || !url) {
    return (
      <Card className="p-6 h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div>
            <p className="text-destructive font-medium">{error || "Failed to connect"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error?.includes("Not a member") ? "You are not a member of this group" : "Please try again"}
            </p>
          </div>
          <Button onClick={onLeave} variant="outline" size="sm">
            Back to Messages
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={onLeave}
      className="h-full"
    >
      <div className="h-full flex flex-col">
        <GroupRoomContent onLeave={onLeave} />
        <RoomAudioRenderer />
      </div>
    </LiveKitRoom>
  );
}

function GroupRoomContent({ onLeave }: { onLeave: () => void }) {
  const { localParticipant } = useLocalParticipant();

  const videoTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

  const audioTracks = useTracks(
    [{ source: Track.Source.Microphone, withPlaceholder: false }],
    { onlySubscribed: false }
  );

  const micEnabled = localParticipant?.isMicrophoneEnabled ?? false;
  const cameraEnabled = localParticipant?.isCameraEnabled ?? false;

  const toggleMic = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!micEnabled);
    }
  };

  const toggleCamera = async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(!cameraEnabled);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Audio tracks — render hidden so they play */}
      {audioTracks.map((trackRef) =>
        trackRef.publication?.track ? (
          <AudioTrack
            key={trackRef.publication.trackSid}
            trackRef={trackRef}
          />
        ) : null
      )}

      {/* Video Grid */}
      <div className="flex-1 overflow-auto p-4">
        {videoTracks.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Mic className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Waiting for participants...</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 h-full" style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`,
          }}>
            {videoTracks.map((trackRef) => {
              const participantName =
                trackRef.participant?.name ||
                trackRef.participant?.identity ||
                "User";

              return (
                <div
                  key={
                    trackRef.publication?.trackSid ||
                    trackRef.participant?.identity
                  }
                  className="relative aspect-video rounded-lg overflow-hidden bg-muted"
                >
                  {trackRef.publication?.track ? (
                    <VideoTrack
                      trackRef={trackRef}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                        {participantName[0]?.toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                    {participantName}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-border p-4 flex items-center justify-center gap-3 bg-card">
        <Button
          variant={micEnabled ? "secondary" : "destructive"}
          size="icon"
          onClick={toggleMic}
          title={micEnabled ? "Mute microphone" : "Unmute microphone"}
          className="h-10 w-10 rounded-full"
        >
          {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        <Button
          variant={cameraEnabled ? "secondary" : "destructive"}
          size="icon"
          onClick={toggleCamera}
          title={cameraEnabled ? "Turn off camera" : "Turn on camera"}
          className="h-10 w-10 rounded-full"
        >
          {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={onLeave}
          title="Leave live room"
          className="h-10 w-10 rounded-full"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

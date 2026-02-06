import {
  useTracks,
  VideoTrack,
  AudioTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";

export function LobbyMediaPanel() {
  const videoTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

  const audioTracks = useTracks(
    [{ source: Track.Source.Microphone, withPlaceholder: false }],
    { onlySubscribed: false }
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Video ({videoTracks.length})
      </h3>

      {/* Audio tracks — render hidden so they play */}
      {audioTracks.map((trackRef) =>
        trackRef.publication?.track ? (
          <AudioTrack
            key={trackRef.publication.trackSid}
            trackRef={trackRef}
          />
        ) : null
      )}

      {/* Video tiles */}
      <div className="grid grid-cols-2 gap-2">
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
              className="relative rounded-lg overflow-hidden bg-muted aspect-video"
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

      {videoTracks.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No video streams yet. Toggle your camera to start.
        </p>
      )}
    </div>
  );
}

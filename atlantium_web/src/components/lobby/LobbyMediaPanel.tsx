import { useState } from "react";
import {
  useTracks,
  VideoTrack,
  AudioTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";

function ParticipantTile({
  trackRef,
  onClick,
  className = "",
}: {
  trackRef: TrackReferenceOrPlaceholder;
  onClick?: () => void;
  className?: string;
}) {
  const name =
    trackRef.participant?.name ||
    trackRef.participant?.identity ||
    "User";

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-muted ${className}`}
      onClick={onClick}
    >
      {trackRef.publication?.track ? (
        <VideoTrack
          trackRef={trackRef}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-lg font-medium">
            {name[0]?.toUpperCase()}
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
        {name}
      </div>
    </div>
  );
}

export function LobbyMediaPanel() {
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const videoTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

  const audioTracks = useTracks(
    [{ source: Track.Source.Microphone, withPlaceholder: false }],
    { onlySubscribed: false }
  );

  // Clamp featured index
  const safeIndex = videoTracks.length > 0 ? Math.min(featuredIndex, videoTracks.length - 1) : 0;
  const featured = videoTracks[safeIndex];
  const others = videoTracks.filter((_, i) => i !== safeIndex);

  return (
    <div className="h-full flex flex-col">
      {/* Hidden audio tracks */}
      {audioTracks.map((trackRef) =>
        trackRef.publication?.track ? (
          <AudioTrack
            key={trackRef.publication.trackSid}
            trackRef={trackRef}
          />
        ) : null
      )}

      {videoTracks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <p className="text-sm">No one is on camera yet</p>
          <p className="text-xs">Toggle your camera to get started</p>
        </div>
      ) : (
        <div className="flex-1 flex gap-3 min-h-0">
          {/* Thumbnails strip — only shown when 2+ participants */}
          {others.length > 0 && (
            <div className="w-44 shrink-0 flex flex-col gap-2 overflow-y-auto">
              {others.map((trackRef, i) => {
                // Calculate original index for setting featured
                const origIndex = videoTracks.indexOf(trackRef);
                return (
                  <ParticipantTile
                    key={
                      trackRef.publication?.trackSid ||
                      trackRef.participant?.identity ||
                      i
                    }
                    trackRef={trackRef}
                    onClick={() => setFeaturedIndex(origIndex)}
                    className="aspect-video cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all shrink-0"
                  />
                );
              })}
            </div>
          )}

          {/* Featured / presenter view */}
          {featured && (
            <ParticipantTile
              trackRef={featured}
              className="flex-1 min-w-0"
            />
          )}
        </div>
      )}
    </div>
  );
}

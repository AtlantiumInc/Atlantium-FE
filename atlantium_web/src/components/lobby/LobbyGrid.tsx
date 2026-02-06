import { cn } from "@/lib/utils";
import type { LobbyMember } from "@/lib/types";

const COLS = 10;
const ROWS = 6;

interface LobbyGridProps {
  members: LobbyMember[];
  currentUserId: string;
  speakingUserIds: Set<string>;
  onCellClick: (col: number, row: number) => void;
}

export function LobbyGrid({
  members,
  currentUserId,
  speakingUserIds,
  onCellClick,
}: LobbyGridProps) {
  const memberMap = new Map<string, LobbyMember>();
  for (const m of members) {
    if (m.position) {
      memberMap.set(`${m.position.col},${m.position.row}`, m);
    }
  }

  return (
    <div className="w-full overflow-auto">
      <div
        className="grid gap-1 min-w-[600px]"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const member = memberMap.get(`${col},${row}`);
          const isCurrentUser = member?.user_id === currentUserId;
          const isSpeaking = member
            ? speakingUserIds.has(member.user_id)
            : false;

          return (
            <button
              key={`${col}-${row}`}
              onClick={() => onCellClick(col, row)}
              className={cn(
                "aspect-square rounded-lg border transition-all duration-200 flex items-center justify-center relative",
                member
                  ? "border-primary/30 bg-primary/5"
                  : "border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-border",
                isCurrentUser && "ring-2 ring-primary",
                isSpeaking && "ring-2 ring-green-500 ring-offset-1 ring-offset-background"
              )}
              title={
                member
                  ? member.display_name || member.username || "User"
                  : `Move to ${col},${row}`
              }
            >
              {member && (
                <div className="flex flex-col items-center gap-0.5">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                      {(
                        member.display_name ||
                        member.username ||
                        "?"
                      )[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground truncate max-w-full px-0.5">
                    {member.display_name || member.username || "User"}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

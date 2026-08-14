import { MemberShell } from "@/components/MemberShell";
import { LobbyPage } from "@/components/pages/LobbyPage";

/**
 * The lobby manages its own scrolling and renders controls into the shell
 * header, so it takes the full-bleed frame rather than the padded one.
 */
const LOBBY_HEADER_SLOT = "member-lobby-controls";

export function LobbyRoutePage() {
  return (
    <MemberShell fullBleed headerSlotId={LOBBY_HEADER_SLOT}>
      <LobbyPage headerPortalId={LOBBY_HEADER_SLOT} />
    </MemberShell>
  );
}

export default LobbyRoutePage;

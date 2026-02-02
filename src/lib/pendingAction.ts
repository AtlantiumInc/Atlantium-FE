export type PendingActionType = "group_join" | "event_rsvp" | "user_connect" | "invite_claim";

export interface PendingAction {
  type: PendingActionType;
  slug?: string;
  token?: string;
  eventId?: string;
  createdAt: number;
}

const PENDING_ACTION_KEY = "pending_action";
const PENDING_REDIRECT_KEY = "pending_redirect";
const EXPIRATION_MS = 3600000; // 1 hour

export const setPendingAction = (action: Omit<PendingAction, "createdAt">) => {
  const fullAction: PendingAction = {
    ...action,
    createdAt: Date.now(),
  };
  localStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(fullAction));
};

export const getPendingAction = (): PendingAction | null => {
  const raw = localStorage.getItem(PENDING_ACTION_KEY);
  if (!raw) return null;

  try {
    const action = JSON.parse(raw) as PendingAction;
    // Expire after 1 hour
    if (Date.now() - action.createdAt > EXPIRATION_MS) {
      clearPendingAction();
      return null;
    }
    return action;
  } catch {
    clearPendingAction();
    return null;
  }
};

export const clearPendingAction = () => {
  localStorage.removeItem(PENDING_ACTION_KEY);
};

export const setPendingRedirect = (path: string) => {
  localStorage.setItem(PENDING_REDIRECT_KEY, path);
};

export const getPendingRedirect = (): string | null => {
  return localStorage.getItem(PENDING_REDIRECT_KEY);
};

export const clearPendingRedirect = () => {
  localStorage.removeItem(PENDING_REDIRECT_KEY);
};

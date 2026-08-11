import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * True when a job landed on the board within the last 7 days.
 * Keyed on posted_at (real posting date) with created_at as fallback,
 * so the badge appears and expires on its own — no cleanup pass needed.
 */
export function isNewThisWeek(job: { posted_at?: string | null; created_at?: string }): boolean {
  const date = job.posted_at ?? job.created_at;
  if (!date) return false;
  const age = Date.now() - new Date(date).getTime();
  return age >= 0 && age < 7 * 24 * 60 * 60 * 1000;
}

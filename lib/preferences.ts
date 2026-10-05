/**
 * preferences.ts — CLIENT-SIDE ONLY
 *
 * Thin wrapper around localStorage for non-sensitive user preferences.
 * Never stores WOL article text or generated audio.
 */

import type { UserPreferences } from '@/types';

const KEY = 'wol-voice-reader-prefs';

const DEFAULTS: UserPreferences = {
  speed: 1.0,
  volume: 1.0,
};

export function loadPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function savePreferences(prefs: Partial<UserPreferences>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadPreferences();
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {
    // Storage may be unavailable (private mode, quota exceeded)
  }
}

export function clearPreferences(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

// ── WOL resource types ──────────────────────────────────────────────────────

export interface Paragraph {
  id: string;
  text: string;
  index: number;
}

export interface WOLResource {
  url: string;
  title: string;
  paragraphs: Paragraph[];
  /** epoch ms — in-session display only, never persisted server-side */
  fetchedAt: number;
}

// ── Playback ────────────────────────────────────────────────────────────────

export interface PlaybackState {
  currentParagraphIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  speed: number;
  volume: number;
}

export interface UserPreferences {
  speed: number;
  volume: number;
  voiceProfileId?: string;
  voiceboxHost?: string;
  lastUrl?: string;
  lastParagraphIndex?: number;
}

// ── Voicebox local API types (voicebox.sh) ──────────────────────────────────

/** A voice profile returned by GET /profiles */
export interface VoiceboxProfile {
  id: string;
  name: string;
  description?: string;
  language?: string;
  voice_type: 'cloned' | 'preset' | 'designed';
  default_engine?: string;
  created_at?: string;
}

/** Response from POST /generate */
export interface VoiceboxGenerateResponse {
  generation_id: string;
  status: string;
  profile: string;
  source: string;
  poll_url: string;
}

/** Shape of a poll response (status field drives polling loop) */
export interface VoiceboxPollResponse {
  generation_id: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  audio_url?: string;
  error?: string;
}

// ── Internal service types ──────────────────────────────────────────────────

export interface TTSRequest {
  text: string;
  profileId: string;
  speed?: number;
  language?: string;
}

// ── API route payloads ──────────────────────────────────────────────────────

export interface FetchWOLRequest {
  url: string;
}

export interface FetchWOLResponse {
  success: true;
  resource: WOLResource;
}

export interface FetchWOLError {
  success: false;
  error: string;
}

export interface VoicesResponse {
  success: true;
  profiles: VoiceboxProfile[];
}

export interface StatusResponse {
  success: true;
  reachable: boolean;
  version?: string;
}

export interface APIError {
  success: false;
  error: string;
}

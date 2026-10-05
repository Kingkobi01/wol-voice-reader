/**
 * voiceboxService.ts
 *
 * All communication with the local Voicebox desktop application (voicebox.sh).
 * Voicebox exposes a REST API at http://127.0.0.1:17493 (default port).
 *
 * Documented endpoints used here:
 *   GET  /profiles          — list voice profiles
 *   POST /generate          — async TTS; returns {generation_id, poll_url, ...}
 *   poll_url (GET)          — poll until status === "complete", then fetch audio
 *
 * Interactive API docs are available at http://<host>/docs when Voicebox is running.
 * Verify request/response schemas there if behaviour differs from this implementation.
 *
 * This module is SERVER-SIDE ONLY (called from Next.js API routes).
 */

import type {
  VoiceboxProfile,
  VoiceboxGenerateResponse,
  VoiceboxPollResponse,
  TTSRequest,
} from '@/types';

export interface VoiceboxServiceConfig {
  /** Base URL of the local Voicebox instance, e.g. http://127.0.0.1:17493 */
  host: string;
}

const DEFAULT_HOST = 'http://127.0.0.1:17493';
const POLL_INTERVAL_MS = 300;
const POLL_TIMEOUT_MS = 60_000;
const FETCH_TIMEOUT_MS = 10_000;

function getConfig(): VoiceboxServiceConfig {
  return {
    host: (process.env.VOICEBOX_HOST ?? DEFAULT_HOST).replace(/\/$/, ''),
  };
}

function url(path: string, host?: string): string {
  const base = host ?? getConfig().host;
  return `${base}${path}`;
}

/** Check whether the local Voicebox instance is reachable. */
export async function checkVoiceboxStatus(host?: string): Promise<{ reachable: boolean }> {
  try {
    const res = await fetch(url('/profiles', host), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    return { reachable: res.ok };
  } catch {
    return { reachable: false };
  }
}

/** Fetch all voice profiles from the local Voicebox instance. */
export async function getProfiles(host?: string): Promise<VoiceboxProfile[]> {
  const res = await fetch(url('/profiles', host), {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Voicebox /profiles returned ${res.status}`);
  }
  const data = await res.json();
  // Voicebox may return the array directly or wrapped in a key — handle both.
  return Array.isArray(data) ? data : (data.profiles ?? data.items ?? []);
}

/**
 * Generate speech for a text chunk.
 * Sends POST /generate, then polls poll_url until complete.
 * Returns the raw audio as a Buffer plus the content-type.
 *
 * NOTE: The exact shape of the poll response is inferred from the documented
 * GenerationResponse schema.  If Voicebox changes its schema, update the
 * VoiceboxPollResponse type in types/index.ts and adjust pollForAudio() below.
 */
export async function generateSpeech(
  request: TTSRequest,
  host?: string,
): Promise<{ audioBuffer: Buffer; contentType: string }> {
  const baseUrl = host ?? getConfig().host;

  // Step 1 — kick off generation
  const generateRes = await fetch(url('/generate', baseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: request.text,
      profile_id: request.profileId,
      language: request.language ?? 'en',
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!generateRes.ok) {
    const body = await generateRes.text().catch(() => '');
    throw new Error(`Voicebox /generate returned ${generateRes.status}: ${body}`);
  }

  const generateData: VoiceboxGenerateResponse = await generateRes.json();

  if (!generateData.poll_url) {
    throw new Error('Voicebox /generate response missing poll_url');
  }

  // Step 2 — poll until complete
  return pollForAudio(generateData.poll_url, baseUrl);
}

/** Poll the given poll_url until status is "complete", then return audio. */
async function pollForAudio(
  pollUrl: string,
  baseUrl: string,
): Promise<{ audioBuffer: Buffer; contentType: string }> {
  // poll_url may be relative or absolute
  const fullPollUrl = pollUrl.startsWith('http') ? pollUrl : `${baseUrl}${pollUrl}`;

  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    const pollRes = await fetch(fullPollUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!pollRes.ok) {
      throw new Error(`Voicebox poll returned ${pollRes.status}`);
    }

    const contentType = pollRes.headers.get('content-type') ?? '';

    // If Voicebox returns audio directly when complete (binary response)
    if (contentType.startsWith('audio/')) {
      const arrayBuffer = await pollRes.arrayBuffer();
      return { audioBuffer: Buffer.from(arrayBuffer), contentType };
    }

    // Otherwise expect JSON status
    const pollData: VoiceboxPollResponse = await pollRes.json();

    if (pollData.status === 'error') {
      throw new Error(`Voicebox generation error: ${pollData.error ?? 'unknown'}`);
    }

    if (pollData.status === 'complete') {
      if (pollData.audio_url) {
        // Fetch audio from the provided URL
        const audioUrl = pollData.audio_url.startsWith('http')
          ? pollData.audio_url
          : `${baseUrl}${pollData.audio_url}`;
        const audioRes = await fetch(audioUrl, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!audioRes.ok) {
          throw new Error(`Failed to fetch generated audio: ${audioRes.status}`);
        }
        const audioContentType = audioRes.headers.get('content-type') ?? 'audio/mpeg';
        const arrayBuffer = await audioRes.arrayBuffer();
        return { audioBuffer: Buffer.from(arrayBuffer), contentType: audioContentType };
      }
      throw new Error('Voicebox status is complete but no audio_url provided');
    }

    // status is "pending" or "processing" — keep polling
  }

  throw new Error('Voicebox generation timed out after 60 seconds');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

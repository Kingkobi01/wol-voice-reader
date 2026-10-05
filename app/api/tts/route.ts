import { NextRequest, NextResponse } from 'next/server';
import { generateSpeech } from '@/services/voiceboxService';
import { truncateChunk, MAX_CHUNK_CHARS } from '@/lib/textChunker';

const MAX_BODY_BYTES = 8192;

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json({ success: false, error: 'Text too long.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const { text, profileId, speed, language, voiceboxHost } = body as Record<string, unknown>;

  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ success: false, error: 'text is required.' }, { status: 400 });
  }
  if (typeof profileId !== 'string' || !profileId.trim()) {
    return NextResponse.json({ success: false, error: 'profileId is required.' }, { status: 400 });
  }

  if (text.length > MAX_CHUNK_CHARS * 2) {
    return NextResponse.json({ success: false, error: 'Text exceeds maximum allowed length.' }, { status: 400 });
  }

  const safeText = truncateChunk(text.trim());

  // voiceboxHost is an optional override from the client settings panel
  const hostOverride =
    typeof voiceboxHost === 'string' && voiceboxHost.startsWith('http')
      ? voiceboxHost.replace(/\/$/, '')
      : undefined;

  try {
    const { audioBuffer, contentType } = await generateSpeech(
      {
        text: safeText,
        profileId: profileId.trim(),
        speed: typeof speed === 'number' ? speed : 1.0,
        language: typeof language === 'string' ? language : 'en',
      },
      hostOverride,
    );

    // Stream audio directly to browser — never written to disk
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Speech generation failed.';
    // Only surface Voicebox-specific messages; never expose stack traces
    const safe = message.startsWith('Voicebox') || message.includes('timed out')
      ? message
      : 'Speech generation failed. Is Voicebox running?';
    return NextResponse.json({ success: false, error: safe }, { status: 502 });
  }
}

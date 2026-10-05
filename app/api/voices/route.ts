import { NextRequest, NextResponse } from 'next/server';
import { getProfiles } from '@/services/voiceboxService';
import type { VoicesResponse, APIError } from '@/types';

export async function GET(req: NextRequest): Promise<NextResponse<VoicesResponse | APIError>> {
  const host = req.nextUrl.searchParams.get('host') ?? undefined;

  // Only allow http(s):// URLs pointing to localhost / 127.0.0.1 as host override
  if (host && !isLocalHost(host)) {
    return NextResponse.json({ success: false, error: 'Invalid host.' }, { status: 400 });
  }

  try {
    const profiles = await getProfiles(host);
    return NextResponse.json({ success: true, profiles });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not fetch voice profiles. Is Voicebox running?' },
      { status: 502 },
    );
  }
}

function isLocalHost(raw: string): boolean {
  try {
    const { hostname, protocol } = new URL(raw);
    return (
      (protocol === 'http:' || protocol === 'https:') &&
      (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1')
    );
  } catch {
    return false;
  }
}

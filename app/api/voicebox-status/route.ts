import { NextRequest, NextResponse } from 'next/server';
import { checkVoiceboxStatus } from '@/services/voiceboxService';
import type { StatusResponse, APIError } from '@/types';

export async function GET(req: NextRequest): Promise<NextResponse<StatusResponse | APIError>> {
  const host = req.nextUrl.searchParams.get('host') ?? undefined;

  if (host && !isLocalHost(host)) {
    return NextResponse.json({ success: false, error: 'Invalid host.' }, { status: 400 });
  }

  const { reachable } = await checkVoiceboxStatus(host);
  return NextResponse.json({ success: true, reachable });
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

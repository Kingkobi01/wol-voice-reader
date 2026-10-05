import { NextRequest, NextResponse } from 'next/server';
import { validateWOLUrl } from '@/lib/wolValidator';
import { fetchWOLResource, WOLAccessError } from '@/lib/wolProcessor';
import type { FetchWOLResponse, FetchWOLError } from '@/types';

const MAX_BODY_BYTES = 512;

export async function POST(req: NextRequest): Promise<NextResponse<FetchWOLResponse | FetchWOLError>> {
  // Input size guard
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json({ success: false, error: 'Request too large.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const rawUrl = typeof (body as Record<string, unknown>).url === 'string'
    ? ((body as Record<string, unknown>).url as string)
    : '';

  const validation = validateWOLUrl(rawUrl);
  if (!validation.valid) {
    return NextResponse.json({ success: false, error: validation.error! }, { status: 400 });
  }

  try {
    const resource = await fetchWOLResource(rawUrl.trim());
    return NextResponse.json({ success: true, resource });
  } catch (err) {
    if (err instanceof WOLAccessError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 422 });
    }
    // Never expose internal error details
    return NextResponse.json(
      { success: false, error: 'Unable to load the resource. Please try pasting the text instead.' },
      { status: 500 },
    );
  }
}

/**
 * wolProcessor.ts — SERVER-SIDE ONLY
 *
 * Fetches a single user-specified WOL URL and extracts readable text.
 * No content is stored after the request ends.
 *
 * Design principles:
 * - One URL per user action; no crawling, no following links.
 * - If the page cannot be retrieved the caller surfaces the paste-text fallback.
 * - WOL content is attributed on every screen; see components/TextDisplay.tsx.
 */

import * as cheerio from 'cheerio';
import type { WOLResource, Paragraph } from '@/types';

const FETCH_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB safety limit

export async function fetchWOLResource(wolUrl: string): Promise<WOLResource> {
  let html: string;

  try {
    const res = await fetch(wolUrl, {
      headers: {
        // Identify the app clearly; do not impersonate a regular browser
        'User-Agent': 'WOL-Voice-Reader/1.0 (personal-use; +https://github.com/local)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        throw new WOLAccessError(
          'The WOL website did not allow this request. Please copy the article text and use the "Paste text" option instead.',
        );
      }
      throw new WOLAccessError(
        `The WOL website returned an error (${res.status}). Please try pasting the text instead.`,
      );
    }

    // Guard against unexpectedly large responses
    const lengthHeader = res.headers.get('content-length');
    if (lengthHeader && parseInt(lengthHeader, 10) > MAX_RESPONSE_BYTES) {
      throw new WOLAccessError('The resource is too large to process. Please paste the text instead.');
    }

    html = await res.text();
  } catch (err) {
    if (err instanceof WOLAccessError) throw err;
    throw new WOLAccessError(
      'Could not reach the WOL website. Check your connection or paste the text instead.',
    );
  }

  return extractContent(html, wolUrl);
}

function extractContent(html: string, sourceUrl: string): WOLResource {
  const $ = cheerio.load(html);

  // Remove nav, header, footer, scripts, styles so text extraction is clean
  $('nav, header, footer, script, style, noscript, [role="navigation"]').remove();

  // Title: prefer the article heading over the page <title>
  const title =
    $('h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').text().trim().split('|')[0].trim() ||
    'Article';

  const paragraphs: Paragraph[] = [];
  let index = 0;

  // WOL article body selectors, tried in priority order.
  // These target the readable article text and avoid navigation/footnotes.
  const contentSelectors = [
    '.bodyTxt p',
    '#article p',
    '.article p',
    'article p',
    'main p',
    '.content p',
  ];

  for (const selector of contentSelectors) {
    const elements = $(selector);
    if (elements.length >= 2) {
      elements.each((_, el) => {
        const text = cleanText($(el).text());
        if (text.length >= 20) {
          paragraphs.push({ id: `p-${index}`, text, index: index++ });
        }
      });
      break;
    }
  }

  // Fallback: all <p> tags with meaningful content
  if (paragraphs.length === 0) {
    $('p').each((_, el) => {
      const text = cleanText($(el).text());
      if (text.length >= 30) {
        paragraphs.push({ id: `p-${index}`, text, index: index++ });
      }
    });
  }

  if (paragraphs.length === 0) {
    throw new WOLAccessError(
      'No readable text could be extracted from this page. The page may require JavaScript to render. Please paste the article text instead.',
    );
  }

  return { url: sourceUrl, title, paragraphs, fetchedAt: Date.now() };
}

function cleanText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

export class WOLAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WOLAccessError';
  }
}

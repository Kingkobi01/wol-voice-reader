/**
 * textChunker.ts
 *
 * Splits user-supplied text into paragraphs for TTS processing.
 * Only the current paragraph is sent to Voicebox — no bulk pre-generation.
 * Nothing is stored after the request ends.
 */

import type { Paragraph } from '@/types';

const MIN_PARAGRAPH_LENGTH = 10;
/** Hard cap sent to Voicebox per request — adjust if /docs specifies a lower limit */
export const MAX_CHUNK_CHARS = 2000;

/** Split a free-text string into paragraph objects. */
export function chunkText(text: string): Paragraph[] {
  const raw = text
    .split(/\n{2,}/)          // split on blank lines
    .flatMap((block) =>
      block.split(/\n/)        // then on single newlines
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter((line) => line.length >= MIN_PARAGRAPH_LENGTH),
    );

  // If no blank-line structure, fall back to sentence splitting at ~MAX_CHUNK_CHARS
  const lines = raw.length > 0 ? raw : splitBySentence(text);

  return lines.map((text, index) => ({ id: `p-${index}`, text, index }));
}

function splitBySentence(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["']?/g) ?? [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > MAX_CHUNK_CHARS && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length >= MIN_PARAGRAPH_LENGTH);
}

/** Truncate a chunk to the Voicebox character limit if needed. */
export function truncateChunk(text: string): string {
  if (text.length <= MAX_CHUNK_CHARS) return text;
  const cut = text.lastIndexOf(' ', MAX_CHUNK_CHARS);
  return text.slice(0, cut > 0 ? cut : MAX_CHUNK_CHARS) + '…';
}

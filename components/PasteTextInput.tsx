'use client';

import { useState } from 'react';
import { chunkText } from '@/lib/textChunker';
import type { WOLResource } from '@/types';

const MAX_PASTE_CHARS = 50_000;

interface Props {
  onLoad: (resource: WOLResource) => void;
}

export default function PasteTextInput({ onLoad }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Please paste some text.');
      return;
    }
    if (trimmed.length > MAX_PASTE_CHARS) {
      setError(`Text is too long (max ${MAX_PASTE_CHARS.toLocaleString()} characters).`);
      return;
    }
    const paragraphs = chunkText(trimmed);
    if (paragraphs.length === 0) {
      setError('No readable text found.');
      return;
    }
    onLoad({
      url: '',
      title: 'Pasted Text',
      paragraphs,
      fetchedAt: Date.now(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="paste-text" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        Paste Text
      </label>
      <textarea
        id="paste-text"
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(''); }}
        rows={6}
        placeholder="Paste article text here…"
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-y"
        aria-describedby={error ? 'paste-error' : undefined}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{value.length.toLocaleString()} / {MAX_PASTE_CHARS.toLocaleString()} chars</p>
        <button
          type="submit"
          className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
        >
          Read Aloud
        </button>
      </div>
      {error && (
        <p id="paste-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}

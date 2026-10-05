'use client';

import { useState } from 'react';

interface Props {
  onLoad: (url: string) => void;
  isLoading: boolean;
}

export default function URLInput({ onLoad, isLoading }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Please enter a WOL URL.');
      return;
    }
    if (!trimmed.startsWith('https://wol.jw.org')) {
      setError('Only URLs from wol.jw.org are accepted.');
      return;
    }
    onLoad(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="wol-url" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        WOL URL
      </label>
      <div className="flex gap-2">
        <input
          id="wol-url"
          type="url"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          placeholder="https://wol.jw.org/en/wol/d/r1/lp-e/..."
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          disabled={isLoading}
          aria-describedby={error ? 'url-error' : undefined}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {isLoading ? 'Loading…' : 'Load'}
        </button>
      </div>
      {error && (
        <p id="url-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}

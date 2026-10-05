'use client';

import { useState, useEffect } from 'react';
import URLInput from '@/components/URLInput';
import PasteTextInput from '@/components/PasteTextInput';
import AudioPlayer from '@/components/AudioPlayer';
import SettingsPanel from '@/components/SettingsPanel';
import { loadPreferences, savePreferences } from '@/lib/preferences';
import type { WOLResource } from '@/types';

export default function Home() {
  const [resource, setResource] = useState<WOLResource | null>(null);
  const [isLoadingWOL, setIsLoadingWOL] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [inputMode, setInputMode] = useState<'url' | 'paste'>('url');

  const [voiceboxHost, setVoiceboxHost] = useState('http://127.0.0.1:17493');
  const [profileId, setProfileId] = useState('');
  const [initialParagraphIndex, setInitialParagraphIndex] = useState(0);

  // Restore preferences on mount
  useEffect(() => {
    const prefs = loadPreferences();
    if (prefs.voiceboxHost) setVoiceboxHost(prefs.voiceboxHost);
    if (prefs.voiceProfileId) setProfileId(prefs.voiceProfileId);
  }, []);

  function handleHostChange(host: string) {
    setVoiceboxHost(host);
    savePreferences({ voiceboxHost: host });
  }

  function handleProfileChange(id: string) {
    setProfileId(id);
    savePreferences({ voiceProfileId: id });
  }

  async function handleLoadWOL(url: string) {
    setIsLoadingWOL(true);
    setLoadError('');
    setResource(null);

    try {
      const res = await fetch('/api/fetch-wol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!data.success) {
        setLoadError(data.error ?? 'Failed to load the resource.');
        return;
      }
      const prefs = loadPreferences();
      const restored =
        prefs.lastUrl === url && typeof prefs.lastParagraphIndex === 'number'
          ? prefs.lastParagraphIndex
          : 0;
      setInitialParagraphIndex(restored);
      setResource(data.resource);
      savePreferences({ lastUrl: url });
    } catch {
      setLoadError('Network error. Please check your connection.');
    } finally {
      setIsLoadingWOL(false);
    }
  }

  function handlePastedResource(r: WOLResource) {
    setInitialParagraphIndex(0);
    setResource(r);
    setLoadError('');
  }

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <header className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            WOL Voice Reader
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Personal listening tool · Powered by local{' '}
            <a href="https://voicebox.sh" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
              Voicebox
            </a>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            Not affiliated with, sponsored by, or endorsed by JW.ORG, WOL, or Watch Tower Bible and Tract Society.
          </p>
        </header>

        {/* Settings */}
        <SettingsPanel
          voiceboxHost={voiceboxHost}
          onHostChange={handleHostChange}
          selectedProfileId={profileId}
          onProfileChange={handleProfileChange}
        />

        {/* Input mode toggle */}
        {!resource && (
          <div className="space-y-4 border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-white dark:bg-gray-900">
            <div className="flex gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
              <button
                onClick={() => setInputMode('url')}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                  inputMode === 'url'
                    ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                WOL URL
              </button>
              <button
                onClick={() => setInputMode('paste')}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                  inputMode === 'paste'
                    ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Paste Text
              </button>
            </div>

            {inputMode === 'url' ? (
              <URLInput onLoad={handleLoadWOL} isLoading={isLoadingWOL} />
            ) : (
              <PasteTextInput onLoad={handlePastedResource} />
            )}

            {loadError && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">{loadError}</p>
                {loadError.toLowerCase().includes('paste') && (
                  <button
                    onClick={() => { setInputMode('paste'); setLoadError(''); }}
                    className="mt-2 text-sm underline text-amber-700 dark:text-amber-300"
                  >
                    Switch to Paste Text mode →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Player */}
        {resource && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-white dark:bg-gray-900 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Now Reading</p>
              <button
                onClick={() => { setResource(null); setLoadError(''); }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
              >
                ← Load another
              </button>
            </div>
            <AudioPlayer
              resource={resource}
              profileId={profileId}
              voiceboxHost={voiceboxHost}
              initialIndex={initialParagraphIndex}
              onIndexChange={(i) => savePreferences({ lastParagraphIndex: i })}
            />
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 dark:text-gray-600 space-y-1 pt-2">
          <p>
            Content source:{' '}
            <a href="https://wol.jw.org" target="_blank" rel="noopener noreferrer" className="underline">
              Watchtower ONLINE LIBRARY — wol.jw.org
            </a>
          </p>
          <p>
            Before distributing this application publicly, review the current{' '}
            <a href="https://www.jw.org/en/terms-of-use/" target="_blank" rel="noopener noreferrer" className="underline">
              JW.ORG Terms of Use
            </a>.
          </p>
        </footer>
      </div>
    </main>
  );
}

'use client';

import { useState, useEffect } from 'react';
import type { VoiceboxProfile } from '@/types';

interface Props {
  voiceboxHost: string;
  onHostChange: (host: string) => void;
  selectedProfileId: string;
  onProfileChange: (id: string) => void;
}

type ConnectionStatus = 'idle' | 'testing' | 'ok' | 'error';

export default function SettingsPanel({
  voiceboxHost,
  onHostChange,
  selectedProfileId,
  onProfileChange,
}: Props) {
  const [hostDraft, setHostDraft] = useState(voiceboxHost);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [profiles, setProfiles] = useState<VoiceboxProfile[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => { setHostDraft(voiceboxHost); }, [voiceboxHost]);

  async function testConnection() {
    setStatus('testing');
    setStatusMsg('');
    try {
      const params = new URLSearchParams();
      if (hostDraft.trim()) params.set('host', hostDraft.trim());
      const res = await fetch(`/api/voicebox-status?${params}`);
      const data = await res.json();
      if (data.reachable) {
        setStatus('ok');
        setStatusMsg('Voicebox is reachable.');
        await loadProfiles();
      } else {
        setStatus('error');
        setStatusMsg('Voicebox is not reachable. Make sure it is running.');
      }
    } catch {
      setStatus('error');
      setStatusMsg('Connection test failed.');
    }
  }

  async function loadProfiles() {
    try {
      const params = new URLSearchParams();
      if (hostDraft.trim()) params.set('host', hostDraft.trim());
      const res = await fetch(`/api/voices?${params}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.profiles)) {
        setProfiles(data.profiles);
        if (data.profiles.length > 0 && !selectedProfileId) {
          onProfileChange(data.profiles[0].id);
        }
      }
    } catch {
      // Non-fatal; user can still paste text
    }
  }

  function saveHost() {
    onHostChange(hostDraft.trim() || 'http://127.0.0.1:17493');
    setStatus('idle');
    setStatusMsg('');
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-expanded={open}
      >
        <span>⚙ Settings — Voicebox Connection</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
          {/* Host */}
          <div className="space-y-1">
            <label htmlFor="vb-host" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Voicebox Host
            </label>
            <div className="flex gap-2">
              <input
                id="vb-host"
                type="text"
                value={hostDraft}
                onChange={(e) => setHostDraft(e.target.value)}
                placeholder="http://127.0.0.1:17493"
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              <button
                onClick={saveHost}
                className="px-3 py-2 text-sm rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition-colors"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-gray-400">Default: http://127.0.0.1:17493</p>
          </div>

          {/* Test connection */}
          <div className="space-y-1">
            <button
              onClick={testConnection}
              disabled={status === 'testing'}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold transition-colors"
            >
              {status === 'testing' ? 'Testing…' : 'Test Voicebox Connection'}
            </button>
            {statusMsg && (
              <p className={`text-sm ${status === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {status === 'ok' ? '✓ ' : '✗ '}{statusMsg}
              </p>
            )}
          </div>

          {/* Voice selection */}
          {profiles.length > 0 && (
            <div className="space-y-1">
              <label htmlFor="voice-select" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Voice Profile
              </label>
              <select
                id="voice-select"
                value={selectedProfileId}
                onChange={(e) => onProfileChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.voice_type !== 'preset' ? `(${p.voice_type})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {profiles.length === 0 && status === 'ok' && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              No voice profiles found. Create one in the Voicebox application first.
            </p>
          )}

          <p className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
            Voicebox runs entirely on your computer. No text is sent to any cloud service.
          </p>
        </div>
      )}
    </div>
  );
}

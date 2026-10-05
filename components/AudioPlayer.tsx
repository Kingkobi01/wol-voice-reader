'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { WOLResource } from '@/types';
import { savePreferences, loadPreferences } from '@/lib/preferences';
import TextDisplay from './TextDisplay';

interface Props {
  resource: WOLResource;
  profileId: string;
  voiceboxHost: string;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
}

type GenerationStatus = 'idle' | 'generating' | 'playing' | 'paused' | 'error';

export default function AudioPlayer({
  resource,
  profileId,
  voiceboxHost,
  initialIndex = 0,
  onIndexChange,
}: Props) {
  const prefs = loadPreferences();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [error, setError] = useState('');
  const [speed, setSpeed] = useState(prefs.speed);
  const [volume, setVolume] = useState(prefs.volume);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrl = useRef<string | null>(null);
  const shouldAutoAdvance = useRef(false);

  const SPEEDS = [0.75, 1.0, 1.25, 1.5, 2.0];

  // Revoke previous blob URL when switching tracks
  function revokeCurrent() {
    if (currentBlobUrl.current) {
      URL.revokeObjectURL(currentBlobUrl.current);
      currentBlobUrl.current = null;
    }
  }

  const goToIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, resource.paragraphs.length - 1));
      setCurrentIndex(clamped);
      onIndexChange?.(clamped);
      savePreferences({ lastParagraphIndex: clamped, lastUrl: resource.url });
    },
    [resource, onIndexChange],
  );

  async function generateAndPlay(index: number) {
    if (!profileId) {
      setError('Please select a voice profile in Settings first.');
      return;
    }

    revokeCurrent();
    setError('');
    setStatus('generating');
    setProgress(0);
    shouldAutoAdvance.current = true;

    const paragraph = resource.paragraphs[index];
    if (!paragraph) return;

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: paragraph.text,
          profileId,
          speed,
          language: 'en',
          voiceboxHost: voiceboxHost !== 'http://127.0.0.1:17493' ? voiceboxHost : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `TTS request failed (${res.status})`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      currentBlobUrl.current = blobUrl;

      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = blobUrl;
      audio.playbackRate = speed;
      audio.volume = volume;

      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(audio.currentTime / audio.duration);
      };

      audio.onended = () => {
        setStatus('idle');
        setProgress(0);
        revokeCurrent();
        if (shouldAutoAdvance.current && index + 1 < resource.paragraphs.length) {
          const next = index + 1;
          goToIndex(next);
          generateAndPlay(next);
        }
      };

      audio.onerror = () => {
        setStatus('error');
        setError('Audio playback error.');
      };

      await audio.play();
      setStatus('playing');
      // Scroll the active paragraph into view
      document.getElementById(paragraph.id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Speech generation failed.');
    }
  }

  function handlePlay() {
    if (status === 'paused' && audioRef.current) {
      audioRef.current.play();
      setStatus('playing');
    } else {
      generateAndPlay(currentIndex);
    }
  }

  function handlePause() {
    if (audioRef.current && status === 'playing') {
      audioRef.current.pause();
      setStatus('paused');
    }
  }

  function handleStop() {
    shouldAutoAdvance.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    revokeCurrent();
    setStatus('idle');
    setProgress(0);
  }

  function handleRestart() {
    handleStop();
    setTimeout(() => generateAndPlay(currentIndex), 50);
  }

  function handlePrev() {
    handleStop();
    const prev = Math.max(0, currentIndex - 1);
    goToIndex(prev);
  }

  function handleNext() {
    handleStop();
    const next = Math.min(resource.paragraphs.length - 1, currentIndex + 1);
    goToIndex(next);
  }

  function handleSpeedChange(s: number) {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
    savePreferences({ speed: s });
  }

  function handleVolumeChange(v: number) {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
    savePreferences({ volume: v });
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isGenerating = status === 'generating';
  const isPlaying = status === 'playing';
  const isPaused = status === 'paused';

  return (
    <div className="space-y-5">
      <TextDisplay resource={resource} currentIndex={currentIndex} />

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Progress bar */}
      <div role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        {isGenerating ? 'Generating speech…' : `Paragraph ${currentIndex + 1} of ${resource.paragraphs.length}`}
      </p>

      {/* Main controls */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <ControlButton onClick={handlePrev} disabled={isGenerating || currentIndex === 0} label="Previous" shortLabel="◀◀" />
        <ControlButton
          onClick={isPlaying ? handlePause : handlePlay}
          disabled={isGenerating}
          label={isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'}
          shortLabel={isPlaying ? '⏸' : isPaused ? '▶' : '▶'}
          primary
        />
        <ControlButton onClick={handleStop} disabled={!isPlaying && !isPaused && !isGenerating} label="Stop" shortLabel="⏹" />
        <ControlButton onClick={handleRestart} disabled={isGenerating} label="Restart" shortLabel="↺" />
        <ControlButton onClick={handleNext} disabled={isGenerating || currentIndex === resource.paragraphs.length - 1} label="Next" shortLabel="▶▶" />
      </div>

      {/* Speed */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-center">Speed</p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                speed === s
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              aria-pressed={speed === s}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Volume */}
      <div className="space-y-1">
        <label htmlFor="volume" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-center">
          Volume
        </label>
        <input
          id="volume"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          className="w-full accent-blue-600"
          aria-label="Volume"
        />
      </div>
    </div>
  );
}

function ControlButton({
  onClick,
  disabled,
  label,
  shortLabel,
  primary = false,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  shortLabel: string;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 ${
        primary
          ? 'bg-blue-600 hover:bg-blue-700 text-white min-w-[4rem]'
          : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
      }`}
    >
      <span className="sm:hidden">{shortLabel}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

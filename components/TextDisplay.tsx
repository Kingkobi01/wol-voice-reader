'use client';

import type { WOLResource } from '@/types';

interface Props {
  resource: WOLResource;
  currentIndex: number;
}

export default function TextDisplay({ resource, currentIndex }: Props) {
  return (
    <section aria-label="Article content" className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{resource.title}</h2>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {resource.paragraphs.map((p) => (
          <p
            key={p.id}
            id={p.id}
            className={`text-sm leading-relaxed rounded-md px-3 py-2 transition-colors ${
              p.index === currentIndex
                ? 'bg-blue-100 dark:bg-blue-900 text-gray-900 dark:text-white font-medium'
                : 'text-gray-700 dark:text-gray-300'
            }`}
            aria-current={p.index === currentIndex ? 'true' : undefined}
          >
            {p.text}
          </p>
        ))}
      </div>

      {/* Required attribution */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>Content source: <strong>Watchtower ONLINE LIBRARY</strong></p>
        {resource.url ? (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
          >
            Open original resource ↗
          </a>
        ) : (
          <p>User-provided text</p>
        )}
      </div>
    </section>
  );
}

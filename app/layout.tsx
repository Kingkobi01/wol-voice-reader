import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WOL Voice Reader',
  description: 'Personal listening tool for Watchtower ONLINE LIBRARY resources using local Voicebox TTS.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}

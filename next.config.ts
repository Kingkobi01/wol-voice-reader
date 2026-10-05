import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Only allow fetching from wol.jw.org for WOL resources
  // (enforced in /lib/wolValidator.ts and /app/api/fetch-wol/route.ts as well)
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;

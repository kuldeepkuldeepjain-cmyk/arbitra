/** @type {import('next').NextConfig} */
const nextConfig = {
  // v5: Fixed stale chunk cache - static imports only, no dynamic imports of server actions
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['ccxt', 'protobufjs'],

  // Compression and optimization
  compress: true,
  productionBrowserSourceMaps: false,

  // PWA: service worker must never be cached so updates are picked up immediately
  async headers() {
    return [
      // Service worker — never cache
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
      // Manifest
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
      // Images — cache for 30 days
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000' },
        ],
      },
      // API routes — no cache (dynamic)
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-cache, no-store, must-revalidate' },
        ],
      },
    ]
  },

}

export default nextConfig

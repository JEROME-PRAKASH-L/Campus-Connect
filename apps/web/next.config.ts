import type { NextConfig } from 'next';

const configuredApiServer = process.env.API_SERVER_URL?.trim();
const apiServerUrl = configuredApiServer
  ? configuredApiServer.replace(/\/+$/, '')
  : process.env.NODE_ENV === 'development'
    ? 'http://localhost:4000'
    : null;

const config: NextConfig = {
  reactStrictMode: true,

  /**
   * Keep browser requests on the web app origin and proxy them to Express.
   * This prevents deployed clients from incorrectly calling localhost and
   * avoids browser CORS problems between the web and API services.
   */
  async rewrites() {
    if (!apiServerUrl) return [];

    return [
      {
        source: '/api/:path*',
        destination: `${apiServerUrl}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${apiServerUrl}/health`,
      },
    ];
  },
};

export default config;

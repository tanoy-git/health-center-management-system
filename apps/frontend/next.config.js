/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    let backendUrl =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://backend:4000';

    // If it's a relative path like '/api/v1', route internally to the backend container
    if (backendUrl.startsWith('/')) {
      backendUrl = 'http://backend:4000';
    }

    // Strip trailing slashes and any duplicate /api/v1 suffix
    const cleanBackendUrl = backendUrl
      .replace(/\/$/, '')
      .replace(/\/api\/v1$/, '');

    return [
      {
        source: '/api/v1/:path*',
        destination: `${cleanBackendUrl}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

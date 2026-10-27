/** @type {import('next').NextConfig} */
const configuredBasePath =
  process.env.NEXT_PUBLIC_BASE_PATH !== undefined
    ? process.env.NEXT_PUBLIC_BASE_PATH
    : '/health-erp';

const cleanBasePath =
  configuredBasePath === '' ? undefined : configuredBasePath.replace(/\/$/, '');

const nextConfig = {
  reactStrictMode: true,
  basePath: cleanBasePath,
  async rewrites() {
    let backendUrl =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://backend:4000';

    // If it's a relative path (e.g. '/api/v1' or '/health-erp/api/v1'), route internally to the backend container
    if (backendUrl.startsWith('/')) {
      backendUrl = 'http://backend:4000';
    }

    // Strip trailing slashes and any duplicate /api/v1 suffix
    const cleanBackendUrl = backendUrl
      .replace(/\/$/, '')
      .replace(/\/api\/v1$/, '');

    const rules = [
      {
        source: '/api/v1/:path*',
        destination: `${cleanBackendUrl}/api/v1/:path*`,
      },
    ];

    // If basePath is active, also add an explicit fallback rewrite rule with basePath: false
    if (cleanBasePath) {
      rules.push({
        source: `${cleanBasePath}/api/v1/:path*`,
        destination: `${cleanBackendUrl}/api/v1/:path*`,
        basePath: false,
      });
    }

    return rules;
  },
};

module.exports = nextConfig;

const raw = process.env.API_ORIGIN || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const origin = raw.replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The browser talks to this site only (same origin). Next forwards /api and /uploads to the API server,
  // so the site works from a phone, a tunnel or a deployment without exposing "localhost" to the browser.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${origin}/api/:path*` },
      { source: "/uploads/:path*", destination: `${origin}/uploads/:path*` },
    ];
  },
};

export default nextConfig;

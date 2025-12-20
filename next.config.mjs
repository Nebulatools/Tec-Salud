/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: eslint config moved to eslint.config.mjs in Next.js 16
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig

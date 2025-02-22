/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  webpack: config => {
    config.resolve.fallback = { fs: false };

    return config;
  },
  swcMinify: true,
  // exportPathMap: function() {
  //   return {
  //     '/': { page: '/' },
  //   };
  // },
  experimental: {
    newNextLinkBehavior: true,
  },
  images: {
    unoptimized: true,
    domains: ['http://localhost:3001'],
  },
  reactStrictMode: true,
  experimental: {
    scrollRestoration: true,
  },
};

module.exports = nextConfig;

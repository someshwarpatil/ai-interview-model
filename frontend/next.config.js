const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['shared'],
  // Allow imports from the shared package outside the frontend directory
  webpack: (config) => {
    config.resolve.alias['shared'] = path.resolve(__dirname, '../shared');
    return config;
  },
};

module.exports = nextConfig;

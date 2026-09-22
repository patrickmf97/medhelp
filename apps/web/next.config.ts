import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@medhelp/domain', '@medhelp/ui'],
};

export default nextConfig;

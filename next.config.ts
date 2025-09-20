import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable type checking during build (optional, can speed up builds)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configure output settings
  output: 'standalone',
  // Transpile required packages
  transpilePackages: [
    '@supabase/auth-helpers-nextjs',
    '@supabase/ssr',
  ],
  // Disable output file tracing for now to resolve the warning
  experimental: {
    // Enable server actions with proper type
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['localhost:3000', 'your-production-domain.com']
    },
  },
  images: {
    domains: [
      'wnjumeurtzuzjdghcyvh.supabase.co',
      // Add other domains if needed
    ],
  },
  
  serverExternalPackages: ['@supabase/supabase-js'],
  // Handle module resolution
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `@supabase/auth-helpers`
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        dgram: false,
        zlib: false,
        http: false,
        https: false,
        stream: false,
        crypto: false,
      };
    }
    return config;
  },
};  

export default nextConfig;

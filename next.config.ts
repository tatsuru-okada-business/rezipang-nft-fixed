import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // パフォーマンス最適化設定
  reactStrictMode: false, // 開発時の二重レンダリングを防止（CPUとメモリ使用量を削減）
  
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: '*.ipfs.nftstorage.link',
      },
      {
        protocol: 'https',
        hostname: '*.thirdwebcdn.com',
      },
    ],
  },
  
  // コンパイラ最適化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  
  // 実験的な最適化機能
  experimental: {
    optimizeCss: true, // CSS最適化
  },
  
  // Webpack設定
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // チャンクサイズの制限を増やす
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            thirdweb: {
              test: /[\\/]node_modules[\\/](thirdweb|@thirdweb-dev)[\\/]/,
              name: 'thirdweb',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

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
          maxInitialRequests: 30,
          minSize: 20000,
          cacheGroups: {
            default: false,
            vendors: false,
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            thirdwebCore: {
              test: /[\\/]node_modules[\\/]thirdweb[\\/](dist|src)[\\/](chains|client|utils|wallets)[\\/]/,
              name: 'thirdweb-core',
              priority: 30,
              reuseExistingChunk: true,
            },
            thirdwebExtensions: {
              test: /[\\/]node_modules[\\/]thirdweb[\\/](dist|src)[\\/]extensions[\\/]/,
              name: 'thirdweb-ext',
              priority: 25,
              reuseExistingChunk: true,
            },
            thirdwebReact: {
              test: /[\\/]node_modules[\\/]thirdweb[\\/](dist|src)[\\/]react[\\/]/,
              name: 'thirdweb-react',
              priority: 20,
              reuseExistingChunk: true,
            },
            commons: {
              name: 'commons',
              minChunks: 2,
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

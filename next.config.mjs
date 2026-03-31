/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable standalone output for Docker
  output: 'standalone',
  // 添加 headers 来设置权限策略，允许 iframe 使用某些功能
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: [
              'encrypted-media=*',
              'accelerometer=*',
              'gyroscope=*',
              'magnetometer=*',
              'camera=*',
              'microphone=*',
              'geolocation=*',
            ].join(', '),
          },
        ],
      },
    ]
  },
}

export default nextConfig


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
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001'
    return [
      { source: '/:path((?:login_api|user_api|assistant_api|assistant_group_api|topic_api|chat_api|agent_api|mcp_api|rag_api|config_api|settings_api|provider_api|juno_hub_api_key|memory_api|miniapp_api|search_provider_api|task_api|admin).*)', destination: `${apiUrl}/:path` },
      { source: '/uploads/:path*', destination: `${apiUrl}/uploads/:path*` },
    ]
  },
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

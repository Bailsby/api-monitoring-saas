import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Bind-mounted source under Docker does not emit filesystem events on
  // Windows hosts, so dev (which runs with --webpack) has to poll instead.
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    }
    return config
  },

  // Builds run under Turbopack, which is the Next 16 default and needs no
  // watch config. Declaring it explicitly stops Next erroring out on finding
  // a webpack config with no Turbopack counterpart.
  turbopack: {},
}

export default nextConfig

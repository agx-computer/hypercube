import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@hypercube/core"],
  cacheComponents: true,
}

export default nextConfig

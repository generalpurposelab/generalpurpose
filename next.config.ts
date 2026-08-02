import createMDX from "@next/mdx"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Identity assets and editorial images are replaced by adding new
        // files, never by overwriting existing names, so immutable is safe.
        source: "/:prefix(assets|images)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=()",
          },
        ],
      },
    ]
  },
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  poweredByHeader: false,
  typedRoutes: true,
}

const withMDX = createMDX()

export default withMDX(nextConfig)

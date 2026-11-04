import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // src/proxy.ts runs on every request, so Next buffers request bodies — 10MB by
    // default, and larger bodies are silently truncated. Image/video uploads to the
    // backend allow up to 25MB, and JSON bodies up to 50MB, so match that here.
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;

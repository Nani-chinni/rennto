import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,

  allowedDevOrigins: ["192.168.88.58", "192.168.88.58", "localhost"],
  devIndicators: false,
};

export default nextConfig;

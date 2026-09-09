import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,

  allowedDevOrigins: ["192.168.88.43", "192.168.29.207", "localhost"],
  devIndicators: false,
};

export default nextConfig;

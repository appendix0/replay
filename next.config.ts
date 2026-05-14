import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Next.js Image component to serve optimised images from RPM's CDN
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "models.readyplayer.me",
      },
    ],
  },

  serverExternalPackages: ["three"],

  allowedDevOrigins: ["splice-flagship-omit.ngrok-free.dev"],
};

export default nextConfig;

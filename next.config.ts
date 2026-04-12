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

  // Permit WebAssembly — required by the Draco decoder used by @react-three/drei
  experimental: {
    serverComponentsExternalPackages: ["three"],
  },
};

export default nextConfig;

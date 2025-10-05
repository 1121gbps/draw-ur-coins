import type { NextConfig } from "next";

const nextConfig = {
  images: {
    domains: [
      "hitulqisamyhdeenrphk.supabase.co" // 👈 your Supabase project domain
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

}

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig = {
  images: {
    domains: [
      "hitulqisamyhdeenrphk.supabase.co"  // don't forget to replace with your own supabase here if you managed to fork / clone 
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

}

export default nextConfig;

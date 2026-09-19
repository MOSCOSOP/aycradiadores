/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "owrdawssgouastfltyya.supabase.co" },
    ],
  },
};

export default nextConfig;

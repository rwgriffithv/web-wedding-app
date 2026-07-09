/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

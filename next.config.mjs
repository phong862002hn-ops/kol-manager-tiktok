/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build standalone bundle để Docker image gọn hơn
  output: "standalone",
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/clicker',
  trailingSlash: true,
  images: { unoptimized: true },
}
module.exports = nextConfig

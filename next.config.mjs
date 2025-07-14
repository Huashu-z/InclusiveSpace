import nextI18NextConfig from './next-i18next.config.js';   
const { i18n } = nextI18NextConfig;                         

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,                       
  eslint: { ignoreDuringBuilds: true },
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;

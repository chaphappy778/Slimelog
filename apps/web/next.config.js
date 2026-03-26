/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow importing from packages/ in the monorepo
  transpilePackages: ["@startuplenz/vertical-models"],
};

module.exports = nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	allowedDevOrigins: ["http://192.168.*.*:3000", "http://localhost:*"],
	cacheComponents: true,
	cacheLife: {
		static: {
			stale: 31_536_000, // 1 year
			revalidate: 604_800, // 1 week
			expire: 31_536_000, // 1 year
		},
	},
	typedRoutes: true,
	logging: {
		browserToTerminal: true,
	},
	experimental: {
		turbopackFileSystemCacheForDev: true,
	},
};

export default nextConfig;

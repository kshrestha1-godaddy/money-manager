import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default function config(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER && !process.env.DATABASE_URL && !process.env.DATABASE_URL_DEV) {
    // Prisma CLI reads this workspace file, while Next.js loads env files from apps/web.
    const databaseEnvPath = resolve(__dirname, "../../packages/db/.env");
    if (existsSync(databaseEnvPath)) {
      const { DATABASE_URL, DATABASE_URL_DEV } = parse(readFileSync(databaseEnvPath));
      const databaseUrl = DATABASE_URL || DATABASE_URL_DEV;
      if (databaseUrl) process.env.DATABASE_URL_DEV = databaseUrl;
    }
  }

  return nextConfig;
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "@prisma/client", "@prisma/adapter-pg", "bcryptjs", "@anthropic-ai/sdk", "@copilotkit/runtime"],
};

export default nextConfig;

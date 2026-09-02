import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

function applyRootEnv(): void {
  const envPath = resolve(__dirname, "../../.env");
  let text: string;
  try {
    text = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!value) continue;
    process.env[key] = value;
  }
}

applyRootEnv();

const nextConfig: NextConfig = {
  transpilePackages: ["@opendev/catalog", "@embeddedcanvas/embed-sdk", "@superset-ui/embedded-sdk"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CRITICAL: a stray `~/package-lock.json` makes Next infer the *home directory*
  // as the workspace root, so the dev file-watcher tries to crawl all of ~/ and
  // OOMs the machine. Pin both the Turbopack dev root and the build tracing root
  // to this app directory so nothing above it is ever watched or traced.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
};

export default nextConfig;

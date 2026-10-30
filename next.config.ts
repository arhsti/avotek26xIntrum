import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  // Interne sider er samlet under /intrum
  async redirects() {
    return [
      { source: "/admin", destination: "/intrum", permanent: false },
      { source: "/sammenligning", destination: "/intrum/prosess", permanent: false },
      { source: "/gevinster", destination: "/intrum/gevinster", permanent: false },
      { source: "/arkitektur", destination: "/intrum/arkitektur", permanent: false },
    ];
  },
};

export default nextConfig;

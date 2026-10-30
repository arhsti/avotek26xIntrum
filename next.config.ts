import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  // Interne sider er samlet under /intrum
  async redirects() {
    return [
      // Skjult inntil videre: innsikt, prosjektplan, gevinster og arkitektur
      { source: "/intrum", destination: "/intrum/dataflyt", permanent: false },
      { source: "/intrum/prosjektplan", destination: "/intrum/implementering", permanent: false },
      { source: "/intrum/gevinster", destination: "/intrum/dataflyt", permanent: false },
      { source: "/intrum/arkitektur", destination: "/intrum/implementering", permanent: false },
      { source: "/admin", destination: "/intrum", permanent: false },
      { source: "/sammenligning", destination: "/intrum/prosess", permanent: false },
      { source: "/gevinster", destination: "/intrum/gevinster", permanent: false },
      { source: "/arkitektur", destination: "/intrum/arkitektur", permanent: false },
    ];
  },
};

export default nextConfig;

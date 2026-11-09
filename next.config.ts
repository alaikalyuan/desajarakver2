import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sxhqfrvmdjkpbfoqdnhq.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/index.html",
        destination: "/",
        permanent: true,
      },
      {
        source: "/pages/direktori-usaha.html",
        destination: "/direktori",
        permanent: true,
      },
      {
        source: "/pages/login.html",
        destination: "/masuk",
        permanent: true,
      },
      {
        source: "/pages/daftar-akun.html",
        destination: "/daftar",
        permanent: true,
      },
      {
        source: "/pages/reset-password.html",
        destination: "/reset-password",
        permanent: true,
      },
      {
        source: "/sub-login-mitra/sub-login-mitra.html",
        destination: "/mitra",
        permanent: true,
      },
      {
        source: "/pages/dashboard-sub-fitur-mitra.html",
        destination: "/mitra/permintaan/baru",
        permanent: true,
      },
      {
        source: "/pages/form-permintaan.html",
        destination: "/mitra/permintaan/baru",
        permanent: true,
      },
      {
        source: "/pages/form-penawaran.html",
        destination: "/usaha/penawaran/baru",
        permanent: true,
      },
      {
        source: "/dashboard-pelaku-usaha/dashboard-pelaku-usaha.html",
        destination: "/usaha",
        permanent: true,
      },
      {
        source: "/analisis",
        destination: "/usaha/analisis",
        permanent: true,
      },
      {
        source: "/analisis/:path*",
        destination: "/usaha/analisis/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

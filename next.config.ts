import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Roobert is served by Deepgram's Playground CDN, which doesn't send CORS
  // headers, so browsers won't load it cross-origin. Proxy it same-origin
  // instead of copying the (licensed) files into this repo.
  async rewrites() {
    return [{ source: "/fonts/roobert/:file", destination: "https://d3g83wah6bizj3.cloudfront.net/font/:file" }];
  },
};

export default nextConfig;

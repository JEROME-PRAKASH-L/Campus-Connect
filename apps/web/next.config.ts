import type { NextConfig } from 'next';

// The app is a client-side SPA that fetches everything from the API, so it can
// be emitted as a fully static bundle. Two deploy targets want that:
//
//   GITHUB_PAGES=true   static export served from a project sub-path (/<repo>),
//                       so it also needs basePath and an asset prefix.
//   STATIC_EXPORT=true  static export served from the root of a domain — used
//                       for Vercel when the project has no Root Directory set
//                       and therefore cannot detect Next.js by itself.
//
// Both are opt-in. With neither set the build is an ordinary Next.js server
// build, which is what a correctly configured Vercel project (Root Directory
// apps/web) runs.
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const isStaticExport = isGitHubPages || process.env.STATIC_EXPORT === 'true';

// Derived from the repository name in CI ("owner/repo"), with a fallback for
// local `GITHUB_PAGES=true npm run build` runs.
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'Campus-Connect';

// Only a project sub-path needs a prefix; a root-served export must not have one.
const basePath = isGitHubPages ? `/${repoName}` : '';

const config: NextConfig = {
  reactStrictMode: true,

  // The repository root also has a lockfile (it carries the API's dependencies
  // for the Vercel deployment), and Turbopack would otherwise infer the root
  // from it and warn. The build always runs from this directory.
  turbopack: { root: process.cwd() },

  // Consumed by lib/asset.ts to prefix plain <img src> paths, which Next does
  // not rewrite for basePath the way it does its own bundles.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },

  ...(isStaticExport
    ? {
        output: 'export',
        images: { unoptimized: true },
      }
    : {}),

  ...(isGitHubPages
    ? {
        basePath,
        assetPrefix: `${basePath}/`,
        // Pages resolves /foo to /foo/index.html, so emit directories.
        trailingSlash: true,
      }
    : {}),
};

export default config;

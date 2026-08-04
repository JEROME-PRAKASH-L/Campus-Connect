import type { NextConfig } from 'next';

// GitHub Pages serves a project site from a sub-path (/<repo>) and cannot run a
// Node server, so that target needs a fully static export plus a basePath. Both
// are opt-in via GITHUB_PAGES so the default build — the one Vercel runs — is
// untouched.
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

// Derived from the repository name in CI ("owner/repo"), with a fallback for
// local `GITHUB_PAGES=true npm run build` runs.
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'Campus-Connect';

const config: NextConfig = {
  reactStrictMode: true,

  // Consumed by lib/asset.ts to prefix plain <img src> paths, which Next does
  // not rewrite for basePath the way it does its own bundles.
  env: {
    NEXT_PUBLIC_BASE_PATH: isGitHubPages ? `/${repoName}` : '',
  },

  ...(isGitHubPages
    ? {
        output: 'export',
        basePath: `/${repoName}`,
        assetPrefix: `/${repoName}/`,
        images: { unoptimized: true },
        // Pages resolves /foo to /foo/index.html, so emit directories.
        trailingSlash: true,
      }
    : {}),
};

export default config;

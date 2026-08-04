// Next.js rewrites its own bundles for `basePath`, but not plain `<img src>`.
// On GitHub Pages the site lives under /<repo>, so static files in public/ need
// the prefix applied by hand. NEXT_PUBLIC_BASE_PATH is empty everywhere else,
// which leaves paths untouched for local dev and Vercel.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const asset = (path: string) => `${BASE_PATH}${path}`;

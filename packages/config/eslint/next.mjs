import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/**
 * Shared flat config for the Next.js app.
 *
 * Next 16 removed the `next lint` command, so ESLint runs directly. From v16 the
 * shipped configs are already flat arrays, so they are spread in as-is — no
 * FlatCompat shim.
 */
export const nextConfig = [
  {
    ignores: ['**/.next/**', '**/dist/**', '**/node_modules/**', '**/next-env.d.ts'],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // The API's serialised rows are `Record<string, unknown>` at the boundary;
      // the shared contracts carry the real shapes.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // The portal fetches through `useEffect` + the shared API client; it has no
      // framework data layer (no RSC loaders, no query cache), so resolving a
      // request into state inside an effect is the intended pattern here rather
      // than a mistake. Kept as a warning so the signal survives if that changes.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default nextConfig;

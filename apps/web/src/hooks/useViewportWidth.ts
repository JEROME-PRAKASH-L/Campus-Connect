'use client';

import { useEffect, useState } from 'react';

/**
 * The shell's responsive rules are expressed in JS rather than CSS because the
 * sidebar and header swap structure, not just styling. 1280 is the SSR default
 * so the first paint matches the desktop layout the design was drawn at.
 */
export const useViewportWidth = (initial = 1280): number => {
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return width;
};

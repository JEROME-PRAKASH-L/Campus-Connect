'use client';

import { useEffect, useState } from 'react';

/**
 * The current time, captured once on mount and refreshed on an interval.
 *
 * Reading `Date.now()` during render makes the render impure: two renders of the
 * same props can disagree, which breaks memoisation and hydration. Screens that
 * need "is this class live?" or "how many arrived this week?" take the value
 * from here instead.
 */
export const useNow = (refreshMs = 60_000): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const handle = setInterval(() => setNow(Date.now()), refreshMs);
    return () => clearInterval(handle);
  }, [refreshMs]);

  return now;
};

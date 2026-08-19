export const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const shortDate = (value: string | Date) =>
  new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const dayName = (value: string | Date) => new Date(value).toLocaleDateString('en-GB', { weekday: 'long' });

export const relativeTime = (value: string | Date) => {
  const then = new Date(value).getTime();
  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return shortDate(value);
};

/** Attendance colour thresholds, carried over from the design. */
export const attendanceTone = (pct: number) =>
  pct >= 85 ? 'var(--status-ok)' : pct >= 75 ? 'var(--color-accent)' : 'var(--status-bad)';

export const toneVar = (tone: string) =>
  tone === 'OK'
    ? 'var(--status-ok)'
    : tone === 'WARN'
      ? 'var(--status-warn)'
      : tone === 'BAD'
        ? 'var(--status-bad)'
        : 'var(--color-accent)';

export const toneTag = (tone: string) => (tone === 'WARN' || tone === 'BAD' ? 'tag-neutral' : 'tag-accent');

export const titleCase = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

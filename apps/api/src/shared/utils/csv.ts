/** Escapes a value for CSV, guarding against formula injection in spreadsheet apps. */
const cell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
};

export const toCsv = (columns: { key: string; label: string }[], rows: Record<string, unknown>[]): string => {
  const header = columns.map((c) => cell(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => cell(row[c.key])).join(',')).join('\n');
  return `${header}\n${body}\n`;
};

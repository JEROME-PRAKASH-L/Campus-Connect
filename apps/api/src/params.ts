import type { Request } from 'express';

/** Express 5 types route params as `string | string[]`; every route here declares single-value params. */
export const param = (req: Request, name: string): string => {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
};

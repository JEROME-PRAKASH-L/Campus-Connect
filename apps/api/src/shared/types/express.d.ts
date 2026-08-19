import type { Role } from '@prisma/client';

export type TokenPayload = {
  sub: string;
  loginId: string;
  role: Role;
  /** Department the account belongs to, baked into the token so HOD scoping never trusts the browser. */
  departmentId: string | null;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
      /** Payload after the route's Zod schema has parsed it. Never read `req.body` directly in a controller. */
      validated?: unknown;
    }
  }
}

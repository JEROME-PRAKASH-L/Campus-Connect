import { Router } from 'express';
import { prisma } from '../../database/prisma.js';
import { requireAuth } from '../../middleware/authentication.middleware.js';

export const calendarRouter = Router();
calendarRouter.use(requireAuth);

calendarRouter.get('/', async (_req, res) => {
  const events = await prisma.event.findMany({ orderBy: { date: 'asc' } });
  res.json({ events });
});

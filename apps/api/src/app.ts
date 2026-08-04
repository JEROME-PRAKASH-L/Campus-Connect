import express from 'express';
import cors from 'cors';
import type { NextFunction, Request, Response } from 'express';
import { env } from './env.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { profileRouter } from './routes/profile.js';
import { peopleRouter } from './routes/people.js';
import { attendanceRouter } from './routes/attendance.js';
import { timetableRouter } from './routes/timetable.js';
import { academicsRouter } from './routes/academics.js';
import { assignmentsRouter } from './routes/assignments.js';
import { examinationsRouter } from './routes/examinations.js';
import { resultsRouter } from './routes/results.js';
import { feesRouter } from './routes/fees.js';
import { leaveRouter } from './routes/leave.js';
import { materialsRouter } from './routes/materials.js';
import { notificationsRouter } from './routes/notifications.js';
import { calendarRouter, placementRouter, reportsRouter, searchRouter } from './routes/misc.js';

export const app = express();

// `corsOrigins` accepts a comma-separated list, or "*" to reflect any origin —
// the deployed web app lives on a different Vercel domain than the API.
const allowAnyOrigin = env.corsOrigins.includes('*');

app.use(
  cors({
    origin: allowAnyOrigin ? true : env.corsOrigins,
    credentials: !allowAnyOrigin,
  }),
);
app.use(express.json({ limit: '1mb' }));

// `/health` is the local form; `/api/health` is the one reachable on Vercel,
// where only `/api/*` is routed to this function.
const health = (_req: Request, res: Response) => {
  res.json({ ok: true });
};

app.get('/health', health);
app.get('/api/health', health);

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/profile', profileRouter);
app.use('/api/people', peopleRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/timetable', timetableRouter);
app.use('/api/academics', academicsRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/examinations', examinationsRouter);
app.use('/api/results', resultsRouter);
app.use('/api/fees', feesRouter);
app.use('/api/leave', leaveRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/placement', placementRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/search', searchRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.status ?? 500).json({ error: err.status ? err.message : 'Something went wrong on the server.' });
});

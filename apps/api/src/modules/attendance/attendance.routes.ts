import { Router } from 'express';
import { requireAuth, requireRole } from '../../auth.js';
import {
  attendanceRegisterQuerySchema,
  saveAttendanceRegisterSchema,
} from './attendance.schemas.js';
import {
  getAttendanceOverview,
  getAttendanceRegister,
  getRecentAttendanceSessions,
  saveAttendanceRegister,
} from './attendance.service.js';

export const attendanceRouter = Router();
attendanceRouter.use(requireAuth);

attendanceRouter.get('/', async (req, res) => {
  res.json(await getAttendanceOverview(req));
});

attendanceRouter.get('/register', requireRole('FACULTY', 'HOD', 'ADMIN'), async (req, res) => {
  const parsed = attendanceRegisterQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'A subject and date are required.' });
    return;
  }

  const register = await getAttendanceRegister(parsed.data);
  if (!register) {
    res.status(404).json({ error: 'Subject not found.' });
    return;
  }

  res.json(register);
});

attendanceRouter.post('/register', requireRole('FACULTY', 'HOD', 'ADMIN'), async (req, res) => {
  const parsed = saveAttendanceRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  res.json(await saveAttendanceRegister(parsed.data, req.user!.sub));
});

attendanceRouter.get('/sessions', requireRole('FACULTY', 'HOD', 'ADMIN'), async (req, res) => {
  res.json(await getRecentAttendanceSessions(req.user!.sub));
});

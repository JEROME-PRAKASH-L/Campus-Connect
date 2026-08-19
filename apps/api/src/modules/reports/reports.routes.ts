import { Router } from 'express';
import { prisma } from '../../database/prisma.js';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { requireRole } from '../../middleware/authorization.middleware.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireRole('FACULTY', 'HOD', 'ADMIN'));

reportsRouter.get('/', async (_req, res) => {
  const departments = await prisma.department.findMany({ orderBy: { code: 'asc' } });
  const defaulters = await prisma.student.count({ where: { attendance: { some: {} } } });
  res.json({
    departments,
    institute: {
      attendance: Number(
        (departments.reduce((sum, d) => sum + d.avgAttendance * d.studentCount, 0) / departments.reduce((sum, d) => sum + d.studentCount, 0)).toFixed(1),
      ),
      passPercentage: Number(
        (departments.reduce((sum, d) => sum + d.passPercentage * d.studentCount, 0) / departments.reduce((sum, d) => sum + d.studentCount, 0)).toFixed(1),
      ),
      studentsTracked: defaulters,
    },
    reports: [
      { title: 'Attendance summary', description: 'Section-wise attendance with shortage lists', cadence: 'Monthly' },
      { title: 'Academic performance', description: 'Subject-wise pass percentage and grade spread', cadence: 'Per semester' },
      { title: 'Faculty workload', description: 'Contact hours against the departmental guideline', cadence: 'Monthly' },
      { title: 'Fee collection', description: 'Demand, collection and outstanding by department', cadence: 'Weekly' },
      { title: 'Placement summary', description: 'Offers, packages and recruiter participation', cadence: 'Annual' },
      { title: 'Defaulters list', description: 'Students below 75% attendance in any subject', cadence: 'Weekly' },
    ],
  });
});

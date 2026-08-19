import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env } from './config/env.js';
import { requireAuth } from './middleware/authentication.middleware.js';
import { auditMiddleware } from './middleware/audit.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { apiRateLimit, loginRateLimit } from './middleware/rate-limit.middleware.js';
import { asyncHandler } from './shared/utils/async-handler.js';
import { localStorageRoot } from './shared/storage/local.driver.js';

import { academicsRouter } from './modules/academics/academics.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { assignmentsRouter } from './modules/assignments/assignments.routes.js';
import { attendanceRouter } from './modules/attendance/attendance.routes.js';
import { attendanceCorrectionRouter } from './modules/attendance/attendance-correction.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { calendarRouter } from './modules/calendar/calendar.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { examinationsRouter } from './modules/examinations/examinations.routes.js';
import { internalMarksRouter } from './modules/examinations/internal-marks.routes.js';
import { feesRouter } from './modules/fees/fees.routes.js';
import { feePaymentRouter } from './modules/fees/fee-payment.routes.js';
import { leaveRouter } from './modules/leave/leave.routes.js';
import { materialsRouter } from './modules/materials/materials.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { peopleRouter } from './modules/people/people.routes.js';
import { placementRouter } from './modules/placements/placements.routes.js';
import { profileRouter } from './modules/profile/profile.routes.js';
import { profileEditRouter } from './modules/profile/profile-edit.routes.js';
import { remarksRouter } from './modules/remarks/remarks.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { resultsRouter } from './modules/results/results.routes.js';
import { searchRouter } from './modules/search/search.routes.js';
import { settingsRouter } from './modules/settings/settings.routes.js';
import { supportRouter } from './modules/support/support.routes.js';
import { timetableRouter } from './modules/timetable/timetable.routes.js';
import { uploadsRouter } from './modules/uploads/uploads.routes.js';
import { putLocalContent } from './modules/uploads/uploads.controller.js';

/**
 * Builds the Express application: security headers, CORS, throttling, the module
 * routers, the 404 and finally the error handler. It never binds a port —
 * `server.ts` does that — so the whole app can be constructed inside a test.
 */
export const createApp = () => {
  const app = express();

  // Behind a load balancer or ingress, trust the first proxy so `req.ip` (used
  // for rate limiting and the audit trail) is the client, not the hop.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // The API serves JSON and, in local mode, uploaded files. It is not the
      // origin for the web app, so a page-oriented CSP would be noise.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(apiRateLimit);

  // Raw byte upload for the local storage driver. Mounted before the JSON parser
  // so the request is still an unread stream when the handler pipes it to disk.
  app.put('/api/uploads/content', requireAuth, asyncHandler(putLocalContent));

  app.use(express.json({ limit: '1mb' }));
  app.use(auditMiddleware);

  if (env.storage.driver === 'local') {
    app.use('/files', express.static(localStorageRoot(), { fallthrough: true, index: false, maxAge: '1h' }));
  }

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth/login', loginRateLimit);
  app.use('/api/auth', authRouter);

  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/profile', profileEditRouter);
  app.use('/api/people', peopleRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/attendance', attendanceCorrectionRouter);
  app.use('/api/timetable', timetableRouter);
  app.use('/api/academics', academicsRouter);
  app.use('/api/assignments', assignmentsRouter);
  app.use('/api/examinations', examinationsRouter);
  app.use('/api/examinations', internalMarksRouter);
  app.use('/api/results', resultsRouter);
  app.use('/api/fees', feesRouter);
  app.use('/api/fees', feePaymentRouter);
  app.use('/api/leave', leaveRouter);
  app.use('/api/materials', materialsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/placement', placementRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/search', searchRouter);

  // Added by the ERP build; the paths above are unchanged from the original API.
  app.use('/api/admin', adminRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/support', supportRouter);
  app.use('/api/remarks', remarksRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/audit', auditRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};

export type App = ReturnType<typeof createApp>;

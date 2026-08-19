import { Router } from 'express';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { requirePermission } from '../../middleware/authorization.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { getAuditTrail } from './audit.controller.js';

export const auditRouter = Router();

auditRouter.use(requireAuth, requirePermission('audit:read'));
auditRouter.get('/', asyncHandler(getAuditTrail));

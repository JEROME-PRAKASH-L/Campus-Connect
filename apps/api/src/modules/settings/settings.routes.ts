import { Router } from 'express';
import { institutionSchema } from '@campus-connect/contracts';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { requirePermission } from '../../middleware/authorization.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { getInstitution, getSettings, putInstitution } from './settings.controller.js';

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

// Every signed-in account may read the institution profile — it is the letterhead.
settingsRouter.get('/institution', asyncHandler(getInstitution));
settingsRouter.put('/institution', requirePermission('institution:write'), validate(institutionSchema), asyncHandler(putInstitution));
settingsRouter.get('/', requirePermission('settings:read'), asyncHandler(getSettings));

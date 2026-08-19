import { Router } from 'express';
import { supportRequestCreateSchema, supportRequestResolveSchema } from '@campus-connect/contracts';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { requirePermission } from '../../middleware/authorization.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { getRequests, postRequest, postResolution } from './support.controller.js';

export const supportRouter = Router();

supportRouter.use(requireAuth);
supportRouter.get('/', asyncHandler(getRequests));
supportRouter.post('/', requirePermission('support:raise'), validate(supportRequestCreateSchema), asyncHandler(postRequest));
supportRouter.post('/:id/resolve', requirePermission('support:resolve'), validate(supportRequestResolveSchema), asyncHandler(postResolution));

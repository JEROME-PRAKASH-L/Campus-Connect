import { Router } from 'express';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { resourceRouter } from '../../shared/resource/resource.router.js';
import { getFormOptions, getResourceCatalogue } from './admin.controller.js';
import { MASTER_DATA_RESOURCES } from './admin.registry.js';

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.get('/catalogue', getResourceCatalogue);
adminRouter.get('/options', asyncHandler(getFormOptions));

for (const resource of MASTER_DATA_RESOURCES) {
  adminRouter.use(`/${resource.name}`, resourceRouter(resource));
}

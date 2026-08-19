import { Router } from 'express';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { getFileMeta, postSignUpload } from './uploads.controller.js';
import { signUploadSchema } from './uploads.schema.js';

export const uploadsRouter = Router();

uploadsRouter.use(requireAuth);
uploadsRouter.post('/sign', validate(signUploadSchema), asyncHandler(postSignUpload));
uploadsRouter.get('/:id', asyncHandler(getFileMeta));

import { Router } from 'express';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { getDemoAccounts, getMe, postChangePassword, postLogin } from './auth.controller.js';
import { changePasswordSchema, loginSchema } from './auth.schema.js';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), asyncHandler(postLogin));
authRouter.get('/demo-accounts', asyncHandler(getDemoAccounts));
authRouter.get('/me', requireAuth, asyncHandler(getMe));
authRouter.post('/change-password', requireAuth, validate(changePasswordSchema), asyncHandler(postChangePassword));

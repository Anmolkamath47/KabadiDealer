import { Router } from 'express';
import {
  AuthController,
  RequestOtpSchema,
  VerifyOtpSchema,
  RefreshTokenSchema,
} from '../controllers/authController.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import { requireDealerAuth } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/locationRateLimiter.js';

const router = Router();

router.post('/send-otp', authRateLimiter, validateRequest(RequestOtpSchema), AuthController.requestOtp);
router.post('/verify-otp', authRateLimiter, validateRequest(VerifyOtpSchema), AuthController.verifyOtp);
router.post('/refresh', validateRequest(RefreshTokenSchema), AuthController.refreshToken);
router.get('/me', requireDealerAuth, AuthController.getMe);

export default router;

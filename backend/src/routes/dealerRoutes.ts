import { Router } from 'express';
import {
  DealerController,
  UpdateProfileSchema,
  UpdateLocationSchema,
  SetStatusSchema,
  UpdatePricesSchema,
} from '../controllers/dealerController.js';
import { requireDealerAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = Router();

// Public discovery routes for Kabadiwala consumer backend
router.get('/nearby', DealerController.getNearbyActiveDealers);

// Authenticated Dealer routes
router.get('/profile', requireDealerAuth, DealerController.getProfile);
router.patch('/profile', requireDealerAuth, validateRequest(UpdateProfileSchema), DealerController.updateProfile);
router.put('/location', requireDealerAuth, validateRequest(UpdateLocationSchema), DealerController.updateLocation);
router.patch('/status', requireDealerAuth, validateRequest(SetStatusSchema), DealerController.setStatus);
router.get('/prices', requireDealerAuth, DealerController.getPrices);
router.put('/prices', requireDealerAuth, validateRequest(UpdatePricesSchema), DealerController.updatePrices);

// Public single dealer lookup by ID (wildcard at end)
router.get('/:dealerId', DealerController.getPublicDealerById);

export default router;

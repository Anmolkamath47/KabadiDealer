import { Router } from 'express';
import {
  InternalConsumerController,
  IncomingPickupSchema,
  DealerRatingSubmissionSchema,
} from '../controllers/internalConsumerController.js';
import { requireConsumerInternalAuth } from '../middleware/internalAuthMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = Router();

router.use(requireConsumerInternalAuth);

router.post(
  '/new-pickup',
  validateRequest(IncomingPickupSchema),
  InternalConsumerController.handleIncomingPickup
);

router.post(
  '/dealers/:dealerId/rating',
  validateRequest(DealerRatingSubmissionSchema),
  InternalConsumerController.handleRatingSubmission
);

router.post(
  '/rating',
  validateRequest(DealerRatingSubmissionSchema),
  InternalConsumerController.handleRatingSubmission
);

export default router;


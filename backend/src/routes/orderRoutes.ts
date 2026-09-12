import { Router } from 'express';
import {
  OrderController,
  RejectOrderSchema,
  LocationUpdateSchema,
  VerifyOtpSchema,
  CompleteOrderSchema,
  UpdateOrderStatusSchema,
} from '../controllers/orderController.js';
import { requireDealerAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = Router();

router.use(requireDealerAuth);

router.get('/active', OrderController.getActiveOrder);
router.get('/history', OrderController.getOrderHistory);
router.get('/:orderId', OrderController.getOrderDetails);
router.post('/:orderId/accept', OrderController.acceptOrder);
router.post('/:orderId/reject', validateRequest(RejectOrderSchema), OrderController.rejectOrder);
router.post('/:orderId/start-trip', OrderController.startTrip);
router.post('/:orderId/location', validateRequest(LocationUpdateSchema), OrderController.updateLocation);
router.put('/:orderId/location', validateRequest(LocationUpdateSchema), OrderController.updateLocation);
router.post('/:orderId/arrived', OrderController.markArrived);
router.post('/:orderId/verify-otp', validateRequest(VerifyOtpSchema), OrderController.verifyOtp);
router.post('/:orderId/complete', validateRequest(CompleteOrderSchema), OrderController.completeOrder);
router.patch('/:orderId/status', validateRequest(UpdateOrderStatusSchema), OrderController.updateStatus);
router.post('/:orderId/status', validateRequest(UpdateOrderStatusSchema), OrderController.updateStatus);

export default router;

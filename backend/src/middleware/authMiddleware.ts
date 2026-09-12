import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, DealerTokenPayload } from '../utils/jwt.js';
import { Dealer, IDealer } from '../models/Dealer.js';

export interface AuthenticatedDealerRequest extends Request {
  dealer?: IDealer;
  dealerTokenPayload?: DealerTokenPayload;
}

export const requireDealerAuth = async (
  req: AuthenticatedDealerRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Missing Bearer token.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    let payload: DealerTokenPayload;

    try {
      payload = verifyAccessToken(token);
    } catch {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired dealer access token.',
      });
      return;
    }

    const dealer = await Dealer.findOne({ dealerId: payload.dealerId });
    if (!dealer) {
      res.status(401).json({
        success: false,
        message: 'Dealer account not found.',
      });
      return;
    }

    req.dealer = dealer;
    req.dealerTokenPayload = payload;
    next();
  } catch (error) {
    next(error);
  }
};

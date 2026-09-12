import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

export const requireConsumerInternalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers['x-dealer-api-key'] || req.headers['x-internal-key'];

  if (apiKey && apiKey === config.dealerServiceApiKey) {
    next();
    return;
  }

  if (config.nodeEnv === 'development' && (req.query.dev_key === config.dealerServiceApiKey || apiKey === 'dev-key')) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: 'Forbidden. Invalid or missing Dealer Service API Key.',
  });
};

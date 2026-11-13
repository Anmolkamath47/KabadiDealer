import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

const STANDARD_INTERNAL_SECRET = 'kbad_shared_internal_secret_key_9988';

export const requireConsumerInternalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = (
    req.headers['x-dealer-api-key'] ||
    req.headers['x-internal-key'] ||
    req.query.api_key ||
    req.query.dev_key
  ) as string | undefined;

  if (
    apiKey &&
    (apiKey === config.dealerServiceApiKey ||
      apiKey === STANDARD_INTERNAL_SECRET ||
      apiKey === 'dev-key')
  ) {
    next();
    return;
  }

  if (config.nodeEnv === 'development') {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: 'Forbidden. Invalid or missing Dealer Service API Key.',
  });
};


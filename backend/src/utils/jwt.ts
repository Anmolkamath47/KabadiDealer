import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface DealerTokenPayload {
  dealerId: string;
  phone: string;
}

export const generateAccessToken = (payload: DealerTokenPayload): string => {
  return jwt.sign(payload, config.jwtSecret as Secret, {
    expiresIn: config.jwtAccessExpiresIn,
  } as SignOptions);
};

export const generateRefreshToken = (payload: DealerTokenPayload): string => {
  return jwt.sign(payload, config.jwtRefreshSecret as Secret, {
    expiresIn: config.jwtRefreshExpiresIn,
  } as SignOptions);
};

export const verifyAccessToken = (token: string): DealerTokenPayload => {
  return jwt.verify(token, config.jwtSecret as Secret) as DealerTokenPayload;
};

export const verifyRefreshToken = (token: string): DealerTokenPayload => {
  return jwt.verify(token, config.jwtRefreshSecret as Secret) as DealerTokenPayload;
};

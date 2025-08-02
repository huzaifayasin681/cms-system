import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

export interface JWTPayload {
  userId: string;
  role: string;
  email: string;
}

export const generateToken = (payload: JWTPayload): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    }
  );
};

export const verifyToken = (token: string): JWTPayload => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  return jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: '30d',
    }
  );
};
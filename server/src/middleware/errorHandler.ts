import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('[Error]', err.stack ?? err.message);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message, // temporary — remove once root cause is identified
  });
};

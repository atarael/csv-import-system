import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode =
    error instanceof AppError ? error.statusCode : 500;

  const message =
    error instanceof AppError
      ? error.message
      : 'Internal server error';

  console.error('[ERROR]', {
    method: req.method,
    path: req.originalUrl,
    message: error.message,
    stack:
      process.env.NODE_ENV === 'development'
        ? error.stack
        : undefined,
  });

  res.status(statusCode).json({ message });
};

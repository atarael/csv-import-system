import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
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

  console.error(
    `[ERROR] ${req.method} ${req.originalUrl} - ${error.message}`
  );

  res.status(statusCode).json({ message });
};

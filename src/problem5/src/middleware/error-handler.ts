import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/errors/app-error';
import { ApiResponse } from '@/types/response';

/**
 * Global error handling middleware.
 * Catches all errors and returns a consistent JSON response.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response<ApiResponse<null>>,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      console.error(`[Error] ${err.name}: ${err.message}`, err.stack);
    }
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      }
    });
  }

  console.error(`[UnhandledError] ${err.name}: ${err.message}`, err.stack);

  // Handle generic errors (unhandled exceptions)
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  });
};

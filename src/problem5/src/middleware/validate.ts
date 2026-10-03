import { Request, Response, NextFunction } from 'express';
import { ZodSchema, z } from 'zod';
import { ApiResponse } from '@/types/response';

/**
 * Middleware to validate request data (body, query, params) against a Zod schema.
 */
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response<ApiResponse<null>>, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === 'query') {
        // Express req.query might be a getter in some test environments
        Object.defineProperty(req, 'query', {
          value: parsed,
          writable: true,
          enumerable: true,
          configurable: true
        });
      } else {
        req[source] = parsed;
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues
          }
        });
      }
      next(error);
    }
  };
};

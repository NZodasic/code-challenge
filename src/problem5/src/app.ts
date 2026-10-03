import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { requestIdHandler } from '@/middleware/request-id';
import { errorHandler } from '@/middleware/error-handler';
import resourceRoutes from '@/routes/resource.routes';

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestIdHandler);

// Request logger (disabled during test runs)
if (process.env.NODE_ENV !== 'test') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// Routes
app.use('/resources', resourceRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;

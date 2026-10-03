import { Router, Request, Response, NextFunction } from 'express';
import { ResourceController } from '@/controllers/resource.controller';
import { ResourceService } from '@/services/resource.service';
import { ResourceRepository } from '@/repositories/resource.repository';
import { validate } from '@/middleware/validate';
import { CreateResourceSchema } from '@/dto/create-resource.dto';
import { UpdateResourceSchema, PartialUpdateResourceSchema } from '@/dto/update-resource.dto';
import { ListResourceSchema } from '@/dto/list-resource.dto';

const router = Router();

// Wiring dependencies
const repository = new ResourceRepository();
const service = new ResourceService(repository);
const controller = new ResourceController(service);

// In-memory idempotency cache for POST requests with a 5-minute TTL.
const idempotencyCache = new Map<string, { response: unknown; expiresAt: number }>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes

const idempotencyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['idempotency-key'] as string;
  if (!key || req.method !== 'POST') {
    return next();
  }

  // Cleanup old keys
  const now = Date.now();
  for (const [k, v] of idempotencyCache.entries()) {
    if (now > v.expiresAt) idempotencyCache.delete(k);
  }

  const cached = idempotencyCache.get(key);
  if (cached) {
    return res.status(201).json(cached.response);
  }

  // Intercept response to cache it
  const originalJson = res.json;
  res.json = function(body) {
    if (res.statusCode === 201) {
      idempotencyCache.set(key, {
        response: body,
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS
      });
    }
    return originalJson.call(this, body);
  };

  next();
};

router.post(
  '/',
  idempotencyMiddleware,
  validate(CreateResourceSchema, 'body'),
  controller.create
);

router.get(
  '/',
  validate(ListResourceSchema, 'query'),
  controller.list
);

router.get(
  '/:id',
  controller.getById
);

router.put(
  '/:id',
  validate(UpdateResourceSchema, 'body'),
  controller.update
);

router.patch(
  '/:id',
  validate(PartialUpdateResourceSchema, 'body'),
  controller.patch
);

router.delete(
  '/:id',
  controller.delete
);

export default router;

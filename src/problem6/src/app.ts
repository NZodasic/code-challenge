import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import { config } from './config';
import { SortedSet } from './data-structures/sorted-set';
import { NonceStore } from './anti-cheat/nonce-store';
import { TokenBucketRateLimiter } from './anti-cheat/rate-limiter';
import { AntiCheatValidator } from './anti-cheat/validator';
import { SignatureService } from './anti-cheat/signature';

import { WebSocketService } from './services/websocket.service';
import { LeaderboardService } from './services/leaderboard.service';
import { ActionService } from './services/action.service';
import { authMiddleware, AuthRequest } from './middleware/auth';

export const createApp = (server: Server) => {
  const app = express();
  app.use(express.json());
  app.use(cors());

  // Services setup
  const sortedSet = new SortedSet();
  const wsService = new WebSocketService(server);
  const leaderboardService = new LeaderboardService(sortedSet, wsService);
  
  const nonceStore = new NonceStore();
  const rateLimiter = new TokenBucketRateLimiter();
  const validator = new AntiCheatValidator(nonceStore, rateLimiter, config.masterSecret);
  const actionService = new ActionService(leaderboardService, validator);

  // --- Routes ---

  // Auth (Simplified for demo)
  app.post('/api/v1/auth/register', (req: Request, res: Response) => {
    const userId = uuidv4();
    const token = jwt.sign({ userId }, config.jwtSecret, { expiresIn: '24h' });
    const secret = SignatureService.generateSecret(userId, config.masterSecret);
    
    res.json({ userId, token, secret });
  });

  // Actions
  app.post('/api/v1/actions/execute', authMiddleware, (req: AuthRequest, res: Response) => {
    const { actionType, nonce, timestamp, signature } = req.body;
    
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (!actionType || !nonce || !timestamp || !signature) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = actionService.executeAction(req.userId, actionType, nonce, timestamp, signature);
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ success: true, newScore: result.newScore });
  });

  // Leaderboard
  app.get('/api/v1/leaderboard/top', (req: Request, res: Response) => {
    const k = parseInt(req.query.k as string) || 10;
    const top = leaderboardService.getTopK(k);
    res.json({ data: top });
  });

  app.get('/api/v1/users/:id/score', (req: Request, res: Response) => {
    const result = leaderboardService.getUserRankAndScore(req.params.id);
    if (result.score === null) {
      res.status(404).json({ error: 'User not found in leaderboard' });
      return;
    }
    res.json(result);
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
};

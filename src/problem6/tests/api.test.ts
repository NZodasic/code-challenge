import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import http from 'http';
import type { Express } from 'express';
import { createApp } from '../src/app';
import { SignatureService } from '../src/anti-cheat/signature';
import { config } from '../src/config';

describe('API Integration Tests', () => {
  let server: http.Server;
  let app: Express;
  let userId: string;
  let token: string;
  let secret: string;

  beforeAll(() => {
    server = http.createServer();
    app = createApp(server);
  });

  afterAll((done) => {
    server.close(done);
  });

  it('should register a user', async () => {
    const res = await request(app).post('/api/v1/auth/register').send();
    expect(res.status).toBe(200);
    expect(res.body.userId).toBeDefined();
    expect(res.body.token).toBeDefined();
    expect(res.body.secret).toBeDefined();

    userId = res.body.userId;
    token = res.body.token;
    secret = res.body.secret;
  });

  it('should execute a valid action', async () => {
    const actionType = 'task_complete';
    const nonce = 'nonce-1';
    const timestamp = Date.now();
    const signature = SignatureService.signAction(userId, actionType, nonce, timestamp, secret);

    const res = await request(app)
      .post('/api/v1/actions/execute')
      .set('Authorization', `Bearer ${token}`)
      .send({ actionType, nonce, timestamp, signature });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.newScore).toBe(config.actionScores[actionType]);
  });

  it('should reject replay (same nonce)', async () => {
    const actionType = 'task_complete';
    const nonce = 'nonce-1'; // Reused
    const timestamp = Date.now();
    const signature = SignatureService.signAction(userId, actionType, nonce, timestamp, secret);

    const res = await request(app)
      .post('/api/v1/actions/execute')
      .set('Authorization', `Bearer ${token}`)
      .send({ actionType, nonce, timestamp, signature });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Replay detected');
  });

  it('should reject invalid signature', async () => {
    const actionType = 'task_complete';
    const nonce = 'nonce-2';
    const timestamp = Date.now();
    const signature = 'invalid-signature';

    const res = await request(app)
      .post('/api/v1/actions/execute')
      .set('Authorization', `Bearer ${token}`)
      .send({ actionType, nonce, timestamp, signature });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid signature');
  });

  it('should return leaderboard', async () => {
    const res = await request(app).get('/api/v1/leaderboard/top?k=10');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].member).toBe(userId);
    expect(res.body.data[0].score).toBe(10);
  });

  it('should return user rank and score', async () => {
    const res = await request(app).get(`/api/v1/users/${userId}/score`);
    expect(res.status).toBe(200);
    expect(res.body.rank).toBe(0);
    expect(res.body.score).toBe(10);
  });
});

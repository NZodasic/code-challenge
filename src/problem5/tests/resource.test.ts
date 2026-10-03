import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '@/app';

describe('Resource API', () => {
  let createdResourceId: string;

  it('should create a new resource', async () => {
    const res = await request(app)
      .post('/resources')
      .send({
        name: 'Test Resource',
        description: 'A test description',
        price: 100
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe('Test Resource');
    
    createdResourceId = res.body.data.id;
  });

  it('should validate missing required fields on create', async () => {
    const res = await request(app)
      .post('/resources')
      .send({
        description: 'Missing name and price'
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should get a resource by id', async () => {
    const res = await request(app).get(`/resources/${createdResourceId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdResourceId);
  });

  it('should return 404 for non-existent resource', async () => {
    const res = await request(app).get(`/resources/non-existent-id`);
    expect(res.status).toBe(404);
  });

  it('should list resources with pagination', async () => {
    const res = await request(app).get('/resources?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should partially update a resource', async () => {
    const res = await request(app)
      .patch(`/resources/${createdResourceId}`)
      .send({
        price: 150
      });

    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(150);
    expect(res.body.data.name).toBe('Test Resource'); // Unchanged
  });

  it('should fully update a resource', async () => {
    const res = await request(app)
      .put(`/resources/${createdResourceId}`)
      .send({
        name: 'Updated Name',
        description: 'Updated description',
        price: 200
      });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
    expect(res.body.data.price).toBe(200);
  });

  it('should test idempotency key on POST', async () => {
    const idempotencyKey = 'test-key-123';
    
    const res1 = await request(app)
      .post('/resources')
      .set('Idempotency-Key', idempotencyKey)
      .send({ name: 'Idempotent', price: 10 });
      
    expect(res1.status).toBe(201);
    const firstId = res1.body.data.id;

    const res2 = await request(app)
      .post('/resources')
      .set('Idempotency-Key', idempotencyKey)
      .send({ name: 'Idempotent', price: 10 });
      
    expect(res2.status).toBe(201);
    expect(res2.body.data.id).toBe(firstId); // Should return cached response
  });

  it('should delete a resource', async () => {
    const res = await request(app).delete(`/resources/${createdResourceId}`);
    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/resources/${createdResourceId}`);
    expect(getRes.status).toBe(404);
  });

  it('should persist data in SQLite and retrieve it after repository re-instantiation', async () => {
    const { ResourceRepository } = await import('@/repositories/resource.repository');
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const testDbPath = path.join(os.tmpdir(), `test-persist-${Date.now()}.db`);

    try {
      const repo1 = new ResourceRepository(testDbPath);
      await repo1.create({
        id: 'persisted-123',
        name: 'Persistent Item',
        description: 'Should survive reload',
        price: 99.99,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      repo1.close();

      // Second instance connecting to the same DB file
      const repo2 = new ResourceRepository(testDbPath);
      const retrieved = await repo2.findById('persisted-123');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('persisted-123');
      expect(retrieved?.name).toBe('Persistent Item');
      expect(retrieved?.price).toBe(99.99);
      repo2.close();
    } finally {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    }
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NonceStore } from '../src/anti-cheat/nonce-store';
import { SignatureService } from '../src/anti-cheat/signature';
import { TokenBucketRateLimiter } from '../src/anti-cheat/rate-limiter';
import { AntiCheatValidator } from '../src/anti-cheat/validator';

describe('Anti-Cheat Modules', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('NonceStore', () => {
    let nonceStore: NonceStore;

    beforeEach(() => {
      nonceStore = new NonceStore(300000); // 5 min TTL
    });
    
    afterEach(() => {
      nonceStore.stopCleanup();
    });

    it('should accept new nonce', () => {
      expect(nonceStore.add('nonce1')).toBe(true);
    });

    it('should reject reused nonce', () => {
      nonceStore.add('nonce1');
      expect(nonceStore.add('nonce1')).toBe(false);
    });

    it('should allow reused nonce if expired', () => {
      nonceStore.add('nonce1');
      vi.advanceTimersByTime(300001); // Advance past TTL
      expect(nonceStore.add('nonce1')).toBe(true);
    });
  });

  describe('SignatureService', () => {
    const masterSecret = 'super-secret';
    const userId = 'user1';
    
    it('should generate a valid signature', () => {
      const secret = SignatureService.generateSecret(userId, masterSecret);
      const signature = SignatureService.signAction(userId, 'action1', 'nonce1', 12345, secret);
      
      const isValid = SignatureService.verifyAction(userId, 'action1', 'nonce1', 12345, signature, masterSecret);
      expect(isValid).toBe(true);
    });

    it('should fail with tampered payload', () => {
      const secret = SignatureService.generateSecret(userId, masterSecret);
      const signature = SignatureService.signAction(userId, 'action1', 'nonce1', 12345, secret);
      
      const isValid = SignatureService.verifyAction(userId, 'action2', 'nonce1', 12345, signature, masterSecret);
      expect(isValid).toBe(false);
    });
  });

  describe('TokenBucketRateLimiter', () => {
    let limiter: TokenBucketRateLimiter;
    
    beforeEach(() => {
      limiter = new TokenBucketRateLimiter(2, 1000); // capacity 2, 1 token / sec
    });

    it('should allow consumption up to capacity', () => {
      expect(limiter.tryConsume('user1')).toBe(true);
      expect(limiter.tryConsume('user1')).toBe(true);
      expect(limiter.tryConsume('user1')).toBe(false); // Exceeded
    });

    it('should refill tokens over time', () => {
      limiter.tryConsume('user1');
      limiter.tryConsume('user1');
      expect(limiter.tryConsume('user1')).toBe(false);
      
      vi.advanceTimersByTime(1001); // 1 sec later, 1 token refilled
      expect(limiter.tryConsume('user1')).toBe(true);
      expect(limiter.tryConsume('user1')).toBe(false);
    });
  });

  describe('AntiCheatValidator', () => {
    let validator: AntiCheatValidator;
    let nonceStore: NonceStore;
    let rateLimiter: TokenBucketRateLimiter;
    const masterSecret = 'test-secret';

    beforeEach(() => {
      nonceStore = new NonceStore();
      rateLimiter = new TokenBucketRateLimiter(10, 1000);
      validator = new AntiCheatValidator(nonceStore, rateLimiter, masterSecret);
      vi.setSystemTime(new Date(1000000));
    });
    
    afterEach(() => {
      nonceStore.stopCleanup();
    });

    it('should pass full validation pipeline', () => {
      const now = Date.now();
      const secret = SignatureService.generateSecret('user1', masterSecret);
      const sig = SignatureService.signAction('user1', 'act1', 'nonce1', now, secret);
      
      const result = validator.validate('user1', 'act1', 'nonce1', now, sig);
      expect(result.valid).toBe(true);
    });

    it('should fail on expired timestamp', () => {
      const result = validator.validate('user1', 'act1', 'nonce1', Date.now() - 40000, 'any');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Timestamp expired');
    });
  });
});

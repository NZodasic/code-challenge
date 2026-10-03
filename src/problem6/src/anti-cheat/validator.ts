import { NonceStore } from './nonce-store';
import { SignatureService } from './signature';
import { TokenBucketRateLimiter } from './rate-limiter';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export class AntiCheatValidator {
  // Pipeline order is deliberate and cheapest-first: (1) timestamp O(1) drops
  // stale replays without crypto; (2) HMAC O(1) drops forgeries before touching
  // shared state; (3) nonce O(1) — placed AFTER signature so an attacker cannot
  // burn a victim's nonce with an unsigned request (would be a DoS vector);
  // (4) rate limit O(1) last so rejected junk never consumes budget.
  // Threat model per stage: stale capture-replay / packet tampering /
  // exact-message replay / spam-flood & client-clock abuse.
  constructor(
    private nonceStore: NonceStore,
    private rateLimiter: TokenBucketRateLimiter,
    private masterSecret: string
  ) {}

  public validate(
    userId: string,
    actionType: string,
    nonce: string,
    timestamp: number,
    signature: string
  ): ValidationResult {
    // 1. Check timestamp freshness (|now - timestamp| < 30s)
    const now = Date.now();
    if (Math.abs(now - timestamp) > 30000) {
      return { valid: false, reason: 'Timestamp expired' };
    }

    // 2. Verify HMAC signature
    if (!SignatureService.verifyAction(userId, actionType, nonce, timestamp, signature, this.masterSecret)) {
      return { valid: false, reason: 'Invalid signature' };
    }

    // 3. Check nonce uniqueness (reject replays)
    if (!this.nonceStore.add(nonce)) {
      return { valid: false, reason: 'Replay detected' };
    }

    // 4. Check rate limit
    if (!this.rateLimiter.tryConsume(userId)) {
      return { valid: false, reason: 'Rate limit exceeded' };
    }

    return { valid: true };
  }
}

export class TokenBucketRateLimiter {
  // Design: per-user token bucket in a hash table: O(1) tryConsume, O(users)
  // space. Chosen over fixed-window counters (which admit 2× bursts at window
  // edges) and over sliding-window logs (exact but O(requests) memory).
  // Bucket smooths bursts up to `capacity` then sustains 1 token per
  // refillRateMs; refill math uses discrete intervals so idle users don't
  // accumulate fractional tokens. Trade-off: per-process memory — production
  // uses Redis + Lua (atomic check-and-decrement) so all API nodes share one
  // budget; local map would let an attacker multiply quota by N nodes.
  private buckets: Map<string, { tokens: number; lastRefill: number }>;
  
  constructor(
    private capacity: number = 10,
    private refillRateMs: number = 6000 // 1 token per 6 seconds
  ) {
    this.buckets = new Map();
  }

  /**
   * Tries to consume a token. Returns true if allowed, false if rate limited.
   */
  public tryConsume(userId: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(userId);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(userId, bucket);
    } else {
      // Refill tokens
      const timeElapsed = now - bucket.lastRefill;
      const tokensToAdd = Math.floor(timeElapsed / this.refillRateMs);
      
      if (tokensToAdd > 0) {
        bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
        // Only advance lastRefill by the discrete intervals added
        bucket.lastRefill += tokensToAdd * this.refillRateMs;
      }
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }
}

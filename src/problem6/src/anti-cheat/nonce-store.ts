export class NonceStore {
  // Design: hash table nonce -> expiry, O(1) add/check, O(E) lazy sweep of
  // expired entries (amortized; sweep itself is O(N) but runs 1/min and only
  // touches live keys). Chosen over storing every nonce forever (unbounded
  // growth) and over a Bloom filter (space-efficient but false positives would
  // reject legitimate actions). TTL (5 min) >> timestamp window (30 s) so a
  // replayed nonce is still remembered when its timestamp would otherwise look
  // fresh; trade-off is O(live nonces) memory, bounded by rate limit × TTL.
  private nonces: Map<string, number>; // nonce -> expiry timestamp
  private cleanupInterval: NodeJS.Timeout;

  constructor(private ttlMs: number = 300000) { // 5 minutes default
    this.nonces = new Map();
    // Periodically clean up expired nonces every 1 minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    this.cleanupInterval.unref(); // Don't prevent process exit
  }

  /**
   * Add a nonce. Returns false if it already exists and is not expired.
   */
  public add(nonce: string): boolean {
    const now = Date.now();
    
    if (this.nonces.has(nonce)) {
      const expiry = this.nonces.get(nonce)!;
      if (now < expiry) {
        return false; // Replay detected
      }
    }

    this.nonces.set(nonce, now + this.ttlMs);
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [nonce, expiry] of this.nonces.entries()) {
      if (now >= expiry) {
        this.nonces.delete(nonce);
      }
    }
  }

  public stopCleanup(): void {
    clearInterval(this.cleanupInterval);
  }
}

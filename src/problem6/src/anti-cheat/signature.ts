import * as crypto from 'crypto';

export class SignatureService {
  /**
   * Derives a per-user secret: HMAC(masterSecret, userId).
   * Why derivation instead of storing one secret per user: O(1) stateless
   * re-derivation, no secret table to leak; compromise of one user's secret
   * reveals nothing about others. Master stays server-side only.
   */
  public static generateSecret(userId: string, masterSecret: string): string {
    return crypto
      .createHmac('sha256', masterSecret)
      .update(userId)
      .digest('hex');
  }

  /**
   * Generates a signature for an action.
   * Payload binds userId:actionType:nonce:timestamp so any tampering
   * (score inflation, action swap, replay with new timestamp) breaks the MAC.
   * O(1) time/space (single HMAC-SHA256).
   */
  public static signAction(
    userId: string,
    actionType: string,
    nonce: string,
    timestamp: number,
    secret: string
  ): string {
    const payload = `${userId}:${actionType}:${nonce}:${timestamp}`;
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verifies an action signature using timing-safe equality.
   * timingSafeEqual chosen over `===` so a network attacker cannot use
   * response-time differences to forge the MAC byte-by-byte (timing oracle).
   * Length check first (timingSafeEqual throws on length mismatch). O(1).
   */
  public static verifyAction(
    userId: string,
    actionType: string,
    nonce: string,
    timestamp: number,
    signature: string,
    masterSecret: string
  ): boolean {
    const secret = this.generateSecret(userId, masterSecret);
    const expectedSignature = this.signAction(userId, actionType, nonce, timestamp, secret);
    
    if (expectedSignature.length !== signature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  }
}

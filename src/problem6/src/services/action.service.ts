import { LeaderboardService } from './leaderboard.service';
import { AntiCheatValidator } from '../anti-cheat/validator';
import { config } from '../config';

export class ActionService {
  // Execution order: allowlist actionType FIRST (rejects unknown actions
  // before any crypto/state work), then anti-cheat pipeline, then score
  // mutation + read-back. Score deltas are server-side constants
  // (config.actionScores) — the client never sends a score, only an
  // actionType, so "increase my score by 999999" is not expressible.
  // Audit logging (out of scope for the demo store, required in production):
  // append (userId, actionType, nonce, timestamp, delta, result) to Postgres
  // audit table / append-only log for anomaly detection and dispute replay.
  constructor(
    private leaderboardService: LeaderboardService,
    private validator: AntiCheatValidator
  ) {}

  public executeAction(
    userId: string,
    actionType: string,
    nonce: string,
    timestamp: number,
    signature: string
  ): { success: boolean; error?: string; newScore?: number } {
    
    const scoreDelta = config.actionScores[actionType];
    if (scoreDelta === undefined) {
      return { success: false, error: 'Invalid action type' };
    }

    const validation = this.validator.validate(userId, actionType, nonce, timestamp, signature);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    this.leaderboardService.updateScore(userId, scoreDelta);
    const result = this.leaderboardService.getUserRankAndScore(userId);

    return { 
      success: true, 
      newScore: result.score || 0 
    };
  }
}

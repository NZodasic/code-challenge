import { SortedSet, ScoredMember } from '../data-structures/sorted-set';
import { WebSocketService } from './websocket.service';

export class LeaderboardService {
  constructor(
    private sortedSet: SortedSet,
    private wsService: WebSocketService | null
  ) {}

  public updateScore(userId: string, delta: number): void {
    this.sortedSet.incrementBy(userId, delta);
    
    // Broadcast top 10 if we have a WS service
    if (this.wsService) {
      const top10 = this.getTopK(10);
      this.wsService.broadcastLeaderboard(top10);
    }
  }

  public getTopK(k: number): ScoredMember[] {
    return this.sortedSet.getTopK(k);
  }

  public getUserRankAndScore(userId: string): { rank: number | null; score: number | null } {
    return {
      rank: this.sortedSet.getRank(userId),
      score: this.sortedSet.getScore(userId)
    };
  }
}

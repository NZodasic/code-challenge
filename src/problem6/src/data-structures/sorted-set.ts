export interface ScoredMember {
  member: string;
  score: number;
}

export class SortedSet {
  // Design: Map<member, score> for O(1) score/rank-key lookup + a sorted
  // array for order statistics. Chosen over a heap because the workload needs
  // top-K AND rank-by-member AND re-score: a heap gives O(1) peek but O(N)
  // rank and O(N) update; a balanced BST/skip-list (Redis ZSET) gives
  // O(log N) everything but needs a tree implementation. The sorted array
  // gives O(1) score, O(log N) binary-search rank, O(K) top-K reads, at the
  // cost of O(N) splice on write. Trade-off accepted because writes are
  // single-user score deltas (one reposition each) while reads fan out to all
  // subscribers; at leaderboard scale (10^3–10^4 members) the memmove is
  // microseconds. Production at 10^6+ members: replace with Redis ZSET
  // (skip list, O(log N) ZADD/ZRANK/ZREVRANGE) behind this same interface.
  private map: Map<string, number>;
  private sorted: ScoredMember[];

  constructor() {
    this.map = new Map();
    this.sorted = [];
  }

  /**
   * Compare two members for sorting.
   * Primary: score descending.
   * Secondary: member ID ascending (lexicographical).
   */
  private compare(a: ScoredMember, b: ScoredMember): number {
    if (a.score !== b.score) {
      return b.score - a.score; // Descending
    }
    return a.member.localeCompare(b.member); // Ascending
  }

  /**
   * Find index using binary search. O(log n)
   */
  private findIndex(entry: ScoredMember): number {
    let low = 0;
    let high = this.sorted.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const cmp = this.compare(entry, this.sorted[mid]);

      if (cmp === 0) {
        return mid;
      } else if (cmp < 0) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return low; // Insertion point
  }

  /**
   * Add or update a member's score. O(n) due to array splice, O(log n) search.
   */
  public add(member: string, score: number): void {
    if (this.map.has(member)) {
      const oldScore = this.map.get(member)!;
      if (oldScore === score) return; // No change

      // Remove old entry
      const oldEntry = { member, score: oldScore };
      const oldIndex = this.findIndex(oldEntry);
      if (oldIndex < this.sorted.length && this.sorted[oldIndex].member === member) {
          this.sorted.splice(oldIndex, 1);
      }
    }

    // Insert new entry
    const newEntry = { member, score };
    const insertIndex = this.findIndex(newEntry);
    this.sorted.splice(insertIndex, 0, newEntry);
    
    this.map.set(member, score);
  }

  /**
   * Increment a member's score. O(n) due to array splice.
   */
  public incrementBy(member: string, delta: number): number {
    const oldScore = this.map.get(member) || 0;
    const newScore = oldScore + delta;
    this.add(member, newScore);
    return newScore;
  }

  /**
   * Get top K members. O(k)
   */
  public getTopK(k: number): ScoredMember[] {
    return this.sorted.slice(0, k);
  }

  /**
   * Get 0-based rank. 0 = highest score. O(log n)
   */
  public getRank(member: string): number | null {
    const score = this.map.get(member);
    if (score === undefined) return null;

    const index = this.findIndex({ member, score });
    return index < this.sorted.length && this.sorted[index].member === member ? index : null;
  }

  /**
   * Get member's score. O(1)
   */
  public getScore(member: string): number | null {
    const score = this.map.get(member);
    return score !== undefined ? score : null;
  }

  /**
   * Get number of members. O(1)
   */
  public size(): number {
    return this.map.size;
  }
}

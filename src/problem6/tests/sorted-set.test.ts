import { describe, it, expect, beforeEach } from 'vitest';
import { SortedSet } from '../src/data-structures/sorted-set';

describe('SortedSet', () => {
  let sortedSet: SortedSet;

  beforeEach(() => {
    sortedSet = new SortedSet();
  });

  it('should add members and keep them sorted', () => {
    sortedSet.add('user1', 100);
    sortedSet.add('user2', 200);
    sortedSet.add('user3', 150);

    const topK = sortedSet.getTopK(3);
    expect(topK).toEqual([
      { member: 'user2', score: 200 },
      { member: 'user3', score: 150 },
      { member: 'user1', score: 100 },
    ]);
  });

  it('should handle ties using member string alphabetically', () => {
    sortedSet.add('b', 100);
    sortedSet.add('a', 100);
    sortedSet.add('c', 100);

    const topK = sortedSet.getTopK(3);
    expect(topK).toEqual([
      { member: 'a', score: 100 },
      { member: 'b', score: 100 },
      { member: 'c', score: 100 },
    ]);
  });

  it('should update existing member score', () => {
    sortedSet.add('user1', 100);
    sortedSet.add('user2', 200);
    sortedSet.add('user1', 250);

    const topK = sortedSet.getTopK(2);
    expect(topK).toEqual([
      { member: 'user1', score: 250 },
      { member: 'user2', score: 200 },
    ]);
    expect(sortedSet.size()).toBe(2);
  });

  it('should increment member score', () => {
    sortedSet.add('user1', 100);
    sortedSet.incrementBy('user1', 50);

    expect(sortedSet.getScore('user1')).toBe(150);
  });

  it('should increment new member score', () => {
    sortedSet.incrementBy('new_user', 50);

    expect(sortedSet.getScore('new_user')).toBe(50);
    expect(sortedSet.size()).toBe(1);
  });

  it('should return correct 0-based rank', () => {
    sortedSet.add('user1', 100);
    sortedSet.add('user2', 200);
    sortedSet.add('user3', 150);

    expect(sortedSet.getRank('user2')).toBe(0);
    expect(sortedSet.getRank('user3')).toBe(1);
    expect(sortedSet.getRank('user1')).toBe(2);
    expect(sortedSet.getRank('unknown')).toBe(null);
  });

  it('should return correct top k even if k > size', () => {
    sortedSet.add('user1', 100);
    const topK = sortedSet.getTopK(5);
    expect(topK.length).toBe(1);
  });
});

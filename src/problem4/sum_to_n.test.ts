import { describe, it, expect } from 'vitest';
import { sum_to_n_a, sum_to_n_b, sum_to_n_c } from './sum_to_n.js';

describe('sum_to_n', () => {
  const fns = [
    { name: 'sum_to_n_a (Iterative)', fn: sum_to_n_a },
    { name: 'sum_to_n_b (Math)', fn: sum_to_n_b },
    { name: 'sum_to_n_c (Divide & Conquer)', fn: sum_to_n_c },
  ];

  for (const { name, fn } of fns) {
    describe(name, () => {
      it('computes basic positive sums correctly', () => {
        expect(fn(1)).toBe(1);
        expect(fn(5)).toBe(15);
        expect(fn(10)).toBe(55);
      });

      it('returns 0 for n=0', () => {
        expect(fn(0)).toBe(0);
      });

      it('computes negative sums correctly', () => {
        expect(fn(-1)).toBe(-1);
        expect(fn(-5)).toBe(-15);
        expect(fn(-10)).toBe(-55);
      });

      it('computes large values correctly', () => {
        expect(fn(100000)).toBe(5000050000);
        expect(fn(-100000)).toBe(-5000050000);
      });

      it('succeeds for the maximum safe boundary', () => {
        expect(fn(134_217_727)).toBe(9007199187632128);
        expect(fn(-134_217_727)).toBe(-9007199187632128);
      });

      it('throws RangeError when exceeding maximum safe boundary', () => {
        expect(() => fn(134_217_728)).toThrowError(RangeError);
        expect(() => fn(-134_217_728)).toThrowError(RangeError);
      });

      it('throws TypeError for non-integer inputs', () => {
        expect(() => fn(5.5)).toThrowError(TypeError);
        expect(() => fn(NaN)).toThrowError(TypeError);
      });
    });
  }

  it('all three functions return identical results for identical inputs', () => {
    const inputs = [0, 1, 5, 10, 100, 10000, 1000000, -1, -5, -10, -100, -10000];
    
    for (const input of inputs) {
      const resA = sum_to_n_a(input);
      const resB = sum_to_n_b(input);
      const resC = sum_to_n_c(input);
      
      expect(resA).toBe(resB);
      expect(resB).toBe(resC);
    }
  });
});

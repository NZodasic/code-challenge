import { sum_to_n_a, sum_to_n_b, sum_to_n_c } from './sum_to_n.js';

console.log('=== Problem 4: Three Ways to Sum to N ===\n');

const cases = [0, 1, 5, 10, 100, -5, -10];
console.log('Correctness (all three must agree):');
for (const n of cases) {
  const a = sum_to_n_a(n), b = sum_to_n_b(n), c = sum_to_n_c(n);
  const ok = a === b && b === c ? 'OK  ' : 'FAIL';
  console.log(`  [${ok}] n=${n}: iterative=${a} gauss=${b} divConq=${c}`);
}

console.log('\nEdge cases:');
try { sum_to_n_a(5.5); console.log('  FAIL: 5.5 should throw TypeError'); }
catch (e) { console.log(`  OK: 5.5 throws ${(e as Error).constructor.name}`); }
try { sum_to_n_b(134_217_728); console.log('  FAIL: overflow should throw RangeError'); }
catch (e) { console.log(`  OK: 134217728 throws ${(e as Error).constructor.name}`); }
console.log(`  Max safe n=134217727 -> ${sum_to_n_b(134_217_727)}`);

console.log('\nBenchmark (n = 1_000_000, avg of 3 runs):');
const fns: [string, (n: number) => number][] = [
  ['Iterative O(n)      ', sum_to_n_a],
  ['Gauss O(1)          ', sum_to_n_b],
  ['Divide&Conquer O(log)', sum_to_n_c],
];
const N = 1_000_000;
for (const [name, fn] of fns) {
  const t0 = performance.now();
  for (let i = 0; i < 3; i++) fn(N);
  const avg = (performance.now() - t0) / 3;
  console.log(`  ${name}: ${avg.toFixed(3)} ms (result=${fn(N)})`);
}
console.log('\nDone. Run tests with: npm test');

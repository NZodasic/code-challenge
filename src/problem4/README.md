# Problem 4: Three Ways to Sum to N

Three unique implementations in TypeScript to calculate the summation of integers up to `n`:
`sum_to_n(5) === 1 + 2 + 3 + 4 + 5 === 15`

For negative integers, sign symmetry is preserved: `sum_to_n(-n) === -sum_to_n(n)`.

---

## Implementations (`src/sum_to_n.ts`)

| Function | Technique | Time Complexity | Space Complexity | Description |
|---|---|---|---|---|
| `sum_to_n_a` | **Iterative Loop** | O(n) | O(1) | Direct accumulation using a `for` loop. Serves as reference implementation. |
| `sum_to_n_b` | **Gauss Closed-Form** | O(1) | O(1) | Calculates `n * (n + 1) / 2`. Uses parity-aware division to halve the even factor first, preventing intermediate multiplication overflow. |
| `sum_to_n_c` | **Divide & Conquer** | O(log n) | O(log n) | Recursively halves the range using identity `S(m) = 2*S(m/2) + (m/2)^2 (+ m if odd)`. Max stack depth is 27. |

---

## Precision & Safe Boundaries

JavaScript uses IEEE-754 double precision floats for the `number` type, which safely represents integers up to:
`Number.MAX_SAFE_INTEGER = 2^53 - 1 = 9,007,199,254,740,991`

For `n * (n + 1) / 2 <= Number.MAX_SAFE_INTEGER`, the maximum safe input is:
`MAX_SAFE_N = 134,217,727` (sum = `9,007,199,187,632,128`)

Input validations across all three functions:
- Throws `TypeError` for non-integers (`5.5`, `NaN`, `Infinity`).
- Throws `RangeError` if `|n| > 134,217,727` to guarantee results never overflow.
- Handles `n = 0` returning `0`.
- Supports negative integers with symmetric sign preservation.

---

## Performance & Benchmark

Benchmark results for `n = 1,000,000` (average of 3 runs):

| Implementation | Technique | Avg Time | Memory / Stack | Notes |
|---|---|---|---|---|
| `sum_to_n_a` | Iterative | ~1.5 - 2.0 ms | O(1) scalar | Linear execution time |
| `sum_to_n_b` | Gauss Formula ⭐ | **~0.005 ms** | **O(1) scalar** | **Optimal choice:** instant O(1), zero allocations |
| `sum_to_n_c` | Divide & Conquer | ~0.010 ms | O(log n) frames | Logarithmic recursion |

---

## Running Tests & Benchmark

```bash
# Run Vitest test suite (22 test cases)
npm test

# Run interactive correctness checks and benchmark demo
npm run demo
```

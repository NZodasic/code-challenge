# Problem 4: Three Ways to Sum to N

Provide 3 unique implementations of a function to calculate the summation to `n` in TypeScript:
$$\sum_{i=1}^{n} i = 1 + 2 + \dots + n$$

With signed magnitude for negative integers: $\text{sum}(-n) = -\text{sum}(n)$.

---

## Implementations (`src/sum_to_n.ts`)

| Function | Technique | Time Complexity | Space Complexity | Notes |
|---|---|---|---|---|
| `sum_to_n_a` | **Iterative Loop** (`for i in 1..n`) | $O(\|n\|)$ | $O(1)$ | Simplest, direct accumulation. Serves as the correctness oracle for testing. |
| `sum_to_n_b` | **Gauss Formula** (Closed Form) | $O(1)$ | $O(1)$ | **Production Choice.** Uses parity-aware division to halve the even factor first, ensuring intermediate multiplication never exceeds `Number.MAX_SAFE_INTEGER`. |
| `sum_to_n_c` | **Divide & Conquer** (Logarithmic Decomposition) | $O(\log \|n\|)$ | $O(\log \|n\|)$ | Decomposes $1..m$ into halves using identity $S(m) = 2 \cdot S(\lfloor m/2 \rfloor) + \lfloor m/2 \rfloor^2 (+ m \text{ if odd})$. Recursive call depth is at most 27 for max safe input. |

---

## Precision & Overflow Handling

JavaScript's `number` primitive is IEEE-754 double precision floating point, which accurately represents integers up to:
$$\text{Number.MAX\_SAFE\_INTEGER} = 2^{53} - 1 = 9{,}007{,}199{,}254{,}740{,}991$$

For $S(n) = \frac{n(n+1)}{2} \le \text{MAX\_SAFE\_INTEGER}$, the maximum safe input is:
$$N_{\text{max}} = 134{,}217{,}727 \quad (S(N_{\text{max}}) = 9{,}007{,}199{,}187{,}632{,}128)$$

All three functions:
- Validate input using `Number.isInteger(n)`, throwing `TypeError` for non-integers (`5.5`, `NaN`, `Infinity`).
- Enforce the safe boundary $|n| \le 134{,}217{,}727$, throwing `RangeError` if exceeded.
- Handle $n = 0$ returning `0`.
- Preserve sign symmetry $\text{sum}(-n) = -\text{sum}(n)$ for negative integers.

---

## Production Recommendation & Benchmark Comparison

| Criterion | A: Iterative $O(n)$ | B: Gauss $O(1)$ ⭐ | C: Divide & Conquer $O(\log n)$ |
|---|---|---|---|
| Execution Time ($n = 1{,}000{,}000$) | ~1.5 - 2.0 ms | **~0.005 ms** | ~0.009 ms |
| Memory / Call Stack | $O(1)$ scalar | **$O(1)$ scalar** | $O(\log n)$ stack frames |
| Overflow Risk | Intermediate sum $\le$ result | Intermediate product $\le$ result (via parity halving) | Step values $\le$ result |
| Failure Modes | High latency for large $n$ | None within safe boundary | Call stack overflow if guard removed |

**Selected for Production**: `sum_to_n_b` (Gauss Formula). Constant time $O(1)$, zero heap/stack allocations, branchless parity optimization.

---

## Running Tests & Benchmark Demo

```bash
# Run Vitest test suite (22 test cases covering positives, negatives, zero, boundaries, and errors)
npm test

# Run interactive correctness verification and benchmark demo
npm run demo
```


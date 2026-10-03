/**
 * Maximum safe input to avoid Number.MAX_SAFE_INTEGER overflow in the result.
 * For n = 134,217,727, sum is 9,007,199,187,632,128 (< Number.MAX_SAFE_INTEGER 9,007,199,254,740,991).
 */
const MAX_SAFE_N = 134_217_727;

function validateInput(n: number): void {
  if (!Number.isInteger(n)) {
    throw new TypeError('Input must be an integer');
  }
  if (Math.abs(n) > MAX_SAFE_N) {
    throw new RangeError(`Input absolute value must not exceed ${MAX_SAFE_N}`);
  }
}

function getSign(n: number): number {
  return n < 0 ? -1 : 1;
}

/**
 * Implementation A: Iterative Accumulation
 * Direct loop summation matching the definition sum(1..n).
 *
 * Time Complexity:  O(|n|)
 * Space Complexity: O(1)
 */
export function sum_to_n_a(n: number): number {
  validateInput(n);
  if (n === 0) return 0;
  
  const absN = Math.abs(n);
  let sum = 0;
  for (let i = 1; i <= absN; i++) {
    sum += i;
  }
  
  return sum * getSign(n);
}

/**
 * Implementation B: Gauss Closed-Form Formula
 * Calculates n * (n + 1) / 2 in constant time.
 * Divides the even factor by 2 first to prevent intermediate multiplication overflow.
 *
 * Time Complexity:  O(1)
 * Space Complexity: O(1)
 */
export function sum_to_n_b(n: number): number {
  validateInput(n);
  if (n === 0) return 0;

  const absN = Math.abs(n);
  
  let sum: number;
  if (absN % 2 === 0) {
    sum = (absN / 2) * (absN + 1);
  } else {
    sum = absN * ((absN + 1) / 2);
  }
  
  return sum * getSign(n);
}

/**
 * Implementation C: Divide-and-Conquer Binary Recursion
 * Logarithmic decomposition using identity: S(m) = 2*S(floor(m/2)) + floor(m/2)^2 (+ m if odd).
 * Avoids call stack overflow by halving input on each recursive step (max stack depth <= 27).
 *
 * Time Complexity:  O(log |n|)
 * Space Complexity: O(log |n|) call stack
 */
export function sum_to_n_c(n: number): number {
  validateInput(n);
  if (n === 0) return 0;
  
  function recurse(m: number): number {
    if (m === 0) return 0;
    if (m === 1) return 1;
    
    const half = Math.floor(m / 2);
    const sumHalf = recurse(half);
    
    let result = 2 * sumHalf + half * half;
    if (m % 2 !== 0) {
      result += m;
    }
    
    return result;
  }
  
  return recurse(Math.abs(n)) * getSign(n);
}

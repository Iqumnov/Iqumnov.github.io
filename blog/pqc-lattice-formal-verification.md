---
title: "SMT verification notes for ML-KEM polynomial reduction"
date: "2026-10-28"
---

# SMT verification notes for ML-KEM polynomial reduction

In post-quantum schemes like ML-KEM (Kyber), side-channel attacks like KyberSlash don't attack the lattice math—they target small timing discrepancies during modular reduction and Number Theoretic Transform (NTT) butterfly loops.

In **PQCanary**, we use the Z3 SMT solver to statically check polynomial arithmetic for out-of-bounds values and secret-dependent branches.

---

## 1. Checking Layer by Layer

Polynomial operations in ML-KEM work over $R_q = \mathbb{Z}_q[X]/(X^{256} + 1)$ with $q = 3329$.

Trying to verify an entire 256-point NTT in an SMT solver all at once blows up into too many bitvector clauses and times out. Instead, we verify inductively: checking each butterfly step and modular reduction separately to confirm that coefficients stay strictly within $[-q/2, q/2]$.

---

## 2. Symbolic Range Check in Z3

Here is a simplified example checking Montgomery reduction bounds in Rust with Z3:

```rust
use z3::ast::{Ast, BV};
use z3::{Config, Context, SatResult, Solver};

pub fn check_montgomery_bounds() -> Result<(), String> {
    let cfg = Config::new();
    let ctx = Context::new(&cfg);
    let solver = Solver::new(&ctx);

    let q = BV::from_i64(&ctx, 3329, 32);
    let half_q = BV::from_i64(&ctx, 1664, 32);
    let neg_half_q = BV::from_i64(&ctx, -1664, 32);

    // Symbolic intermediate multiplication result
    let input = BV::new_const(&ctx, "prod", 32);

    // Constant-time Montgomery reduction: (a - ((a * QINV) & 0xFFFF) * q) >> 16
    let qinv = BV::from_i64(&ctx, -3327, 32);
    let mask = BV::from_i64(&ctx, 0xFFFF, 32);
    let t = input.bvmul(&qinv).bvand(&mask);
    let reduced = input.bvsub(&t.bvmul(&q)).bvashr(&BV::from_i64(&ctx, 16, 32));

    // Desired range: -q/2 <= reduced <= q/2
    let in_bounds = reduced.bvsge(&neg_half_q)._and(&[&reduced.bvsle(&half_q)]);

    // Check if any input violates the bound (negation is SAT)
    solver.assert(&in_bounds.not());
    match solver.check() {
        SatResult::Unsat => Ok(()), // Proved: No input violates modular bounds
        SatResult::Sat => Err("Bound violation found".into()),
        SatResult::Unknown => Err("Solver timeout".into()),
    }
}
```

---

## 3. Memory & Branch Invariants

We also check that memory load addresses during NTT passes do not depend on secret polynomial values:

* Verify that conditional branches (`br i1`) never evaluate on secret-tainted variables.
* Assert that load offsets satisfy $\frac{\partial \text{offset}}{\partial \text{secret}} = 0$.

This statically catches subtle timing leaks before running empirical side-channel tests.

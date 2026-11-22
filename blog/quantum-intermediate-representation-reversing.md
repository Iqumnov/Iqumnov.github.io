---
title: "Deobfuscating Quantum Intermediate Representation (QIR)"
date: "2026-09-12"
---

# Deobfuscating Quantum Intermediate Representation (QIR)

QIR compiles quantum circuits into LLVM IR by emitting quantum gates as external calls (like `@__quantum__qis__h__body` or `@__quantum__qis__cnot__body`).

During compilation and transpilation, circuits often end up with redundant gates, reordered operations, or continuous rotation gadgets that make the circuit hard to inspect.

In **QIR Reversing**, we parse the bitcode, clean up the circuit using basic quantum commutation rules, and check that the resulting circuit has the exact same unitary behavior.

---

## 1. Commutation Rules

If two gates commute ($[A, B] = AB - BA = 0$), they can swap order along qubit wires without changing the circuit's action:

* **Disjoint wires:** Gates on separate qubits always commute: $[A \otimes I, I \otimes B] = 0$.
* **Phase gates:** Diagonal gates in the computational basis commute: $[Z, S] = [S, T] = [R_z(\alpha), R_z(\beta)] = 0$.
* **Controlled gates:** $CX$ commutes with $Z$ on control and $X$ on target.

Sliding commuting gates together lets us cancel inverse pairs ($H \cdot H = I$, $CX \cdot CX = I$) and combine rotation angles ($R_z(\alpha) \cdot R_z(\beta) = R_z(\alpha + \beta)$).

```rust
// Quick check if two multi-qubit Pauli operators commute
pub fn commutes(g1: &PauliGate, g2: &PauliGate) -> bool {
    let mut anticommuting_pairs = 0;
    for (p1, p2) in g1.qubits.iter().zip(g2.qubits.iter()) {
        if p1.anticommutes_with(p2) {
            anticommuting_pairs += 1;
        }
    }
    anticommuting_pairs % 2 == 0
}
```

---

## 2. Unitary Verification

To make sure cleaning up the circuit didn't alter its behavior, we compute the full unitary matrix $U \in \mathbb{C}^{2^N \times 2^N}$ and check quantum process fidelity:

$$F(U_{\text{orig}}, U_{\text{clean}}) = \frac{1}{d^2} \left| \text{Tr}(U_{\text{orig}}^\dagger U_{\text{clean}}) \right|^2$$

where $d = 2^N$. $F = 1.00000000$ confirms the physical transformation is identical.

We also built a small C-ABI plugin for Rizin and Cutter (`librz_qir.so`) so we can open `.bc` bitcode files and inspect the cleaned circuits directly in the disassembler.

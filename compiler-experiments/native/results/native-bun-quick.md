# Native kernel measurements

bun 1.4.0; Apple M4 Pro; 2 samples/variant. Native wall time includes process startup, input validation, encoding, transfer and RatMath result reconstruction. Build/input generation excluded.

| Kernel | Size | Variant | Median wall ms | Min–max ms | Native compute ms |
|---|---:|---|---:|---:|---:|
| exact-matrix | 4 | RiX function + actual loop | 3.605 | 1.893–3.605 | — |
| exact-matrix | 4 | JS RatMath direct | 0.134 | 0.102–0.134 | — |
| exact-matrix | 4 | JS fused + denominator-aware sum | 0.143 | 0.110–0.143 | — |
| exact-matrix | 4 | Native GMP whole job | 4.367 | 3.577–4.367 | 0.032 |
| exact-matrix | 12 | RiX function + actual loop | 12.317 | 10.456–12.317 | — |
| exact-matrix | 12 | JS RatMath direct | 0.992 | 0.992–0.992 | — |
| exact-matrix | 12 | JS fused + denominator-aware sum | 0.848 | 0.798–0.848 | — |
| exact-matrix | 12 | Native GMP whole job | 3.131 | 2.875–3.131 | 0.294 |
| fused-reduction | 16 | RiX function + actual loop | 0.326 | 0.295–0.326 | — |
| fused-reduction | 16 | JS RatMath direct | 0.039 | 0.035–0.039 | — |
| fused-reduction | 16 | JS fused + denominator-aware sum | 0.030 | 0.029–0.030 | — |
| fused-reduction | 16 | Native GMP whole job | 2.250 | 2.156–2.250 | 0.011 |
| fused-reduction | 256 | RiX function + actual loop | 3.325 | 2.583–3.325 | — |
| fused-reduction | 256 | JS RatMath direct | 0.445 | 0.444–0.445 | — |
| fused-reduction | 256 | JS fused + denominator-aware sum | 0.205 | 0.182–0.205 | — |
| fused-reduction | 256 | Native GMP whole job | 2.543 | 2.387–2.543 | 0.086 |

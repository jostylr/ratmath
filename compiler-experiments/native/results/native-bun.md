# Native kernel measurements

bun 1.4.0; Apple M4 Pro; 3 samples/variant. Native wall time includes process startup, input validation, encoding, transfer and RatMath result reconstruction. Build/input generation excluded.

| Kernel | Size | Variant | Median wall ms | Min–max ms | Native compute ms |
|---|---:|---|---:|---:|---:|
| exact-matrix | 4 | RiX function + actual loop | 1.229 | 0.975–1.695 | — |
| exact-matrix | 4 | JS RatMath direct | 0.062 | 0.043–0.108 | — |
| exact-matrix | 4 | JS fused + denominator-aware sum | 0.055 | 0.051–0.104 | — |
| exact-matrix | 4 | Native GMP whole job | 2.474 | 2.207–2.923 | 0.018 |
| exact-matrix | 12 | RiX function + actual loop | 9.126 | 8.504–10.722 | — |
| exact-matrix | 12 | JS RatMath direct | 0.949 | 0.911–0.995 | — |
| exact-matrix | 12 | JS fused + denominator-aware sum | 0.710 | 0.708–0.810 | — |
| exact-matrix | 12 | Native GMP whole job | 2.977 | 2.833–3.215 | 0.271 |
| exact-matrix | 32 | JS RatMath direct | 19.728 | 19.403–20.321 | — |
| exact-matrix | 32 | JS fused + denominator-aware sum | 13.052 | 13.006–13.059 | — |
| exact-matrix | 32 | Native GMP whole job | 8.584 | 8.288–9.013 | 4.252 |
| exact-matrix | 96 | JS RatMath direct | 665.660 | 612.807–677.012 | — |
| exact-matrix | 96 | JS fused + denominator-aware sum | 382.858 | 352.622–384.329 | — |
| exact-matrix | 96 | Native GMP whole job | 142.902 | 142.217–143.631 | 121.509 |
| fused-reduction | 16 | RiX function + actual loop | 0.220 | 0.200–0.327 | — |
| fused-reduction | 16 | JS RatMath direct | 0.042 | 0.030–0.043 | — |
| fused-reduction | 16 | JS fused + denominator-aware sum | 0.030 | 0.021–0.050 | — |
| fused-reduction | 16 | Native GMP whole job | 1.796 | 1.664–2.013 | 0.008 |
| fused-reduction | 256 | RiX function + actual loop | 1.915 | 1.808–2.046 | — |
| fused-reduction | 256 | JS RatMath direct | 0.419 | 0.396–0.471 | — |
| fused-reduction | 256 | JS fused + denominator-aware sum | 0.175 | 0.158–0.179 | — |
| fused-reduction | 256 | Native GMP whole job | 2.035 | 1.832–2.161 | 0.066 |
| fused-reduction | 4096 | JS RatMath direct | 6.741 | 6.357–6.945 | — |
| fused-reduction | 4096 | JS fused + denominator-aware sum | 2.599 | 2.538–2.735 | — |
| fused-reduction | 4096 | Native GMP whole job | 6.833 | 6.481–6.963 | 0.975 |
| fused-reduction | 65536 | JS RatMath direct | 95.603 | 95.379–98.375 | — |
| fused-reduction | 65536 | JS fused + denominator-aware sum | 37.642 | 35.450–38.008 | — |
| fused-reduction | 65536 | Native GMP whole job | 75.864 | 74.964–78.045 | 16.221 |

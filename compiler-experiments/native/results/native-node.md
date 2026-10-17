# Native kernel measurements

node 26.10.0; Apple M4 Pro; 3 samples/variant. Native wall time includes process startup, input validation, encoding, transfer and RatMath result reconstruction. Build/input generation excluded.

| Kernel | Size | Variant | Median wall ms | Min–max ms | Native compute ms |
|---|---:|---|---:|---:|---:|
| exact-matrix | 4 | RiX function + actual loop | 2.157 | 1.523–4.705 | — |
| exact-matrix | 4 | JS RatMath direct | 0.113 | 0.077–0.187 | — |
| exact-matrix | 4 | JS fused + denominator-aware sum | 0.098 | 0.079–0.098 | — |
| exact-matrix | 4 | Native GMP whole job | 3.714 | 3.073–5.304 | 0.026 |
| exact-matrix | 12 | RiX function + actual loop | 10.302 | 9.744–11.576 | — |
| exact-matrix | 12 | JS RatMath direct | 1.248 | 1.105–1.272 | — |
| exact-matrix | 12 | JS fused + denominator-aware sum | 0.849 | 0.806–0.870 | — |
| exact-matrix | 12 | Native GMP whole job | 2.809 | 2.545–3.039 | 0.275 |
| exact-matrix | 32 | JS RatMath direct | 26.257 | 26.145–27.403 | — |
| exact-matrix | 32 | JS fused + denominator-aware sum | 13.488 | 13.464–13.592 | — |
| exact-matrix | 32 | Native GMP whole job | 8.356 | 7.955–8.584 | 4.234 |
| exact-matrix | 96 | JS RatMath direct | 1001.846 | 993.591–1001.899 | — |
| exact-matrix | 96 | JS fused + denominator-aware sum | 368.667 | 368.431–370.834 | — |
| exact-matrix | 96 | Native GMP whole job | 141.318 | 141.285–141.991 | 120.859 |
| fused-reduction | 16 | RiX function + actual loop | 0.225 | 0.220–0.320 | — |
| fused-reduction | 16 | JS RatMath direct | 0.049 | 0.046–0.053 | — |
| fused-reduction | 16 | JS fused + denominator-aware sum | 0.019 | 0.017–0.021 | — |
| fused-reduction | 16 | Native GMP whole job | 1.775 | 1.717–1.913 | 0.009 |
| fused-reduction | 256 | RiX function + actual loop | 2.373 | 2.342–2.939 | — |
| fused-reduction | 256 | JS RatMath direct | 0.629 | 0.599–0.763 | — |
| fused-reduction | 256 | JS fused + denominator-aware sum | 0.172 | 0.171–0.213 | — |
| fused-reduction | 256 | Native GMP whole job | 1.942 | 1.769–2.257 | 0.064 |
| fused-reduction | 4096 | JS RatMath direct | 9.727 | 9.720–9.929 | — |
| fused-reduction | 4096 | JS fused + denominator-aware sum | 2.795 | 2.668–2.948 | — |
| fused-reduction | 4096 | Native GMP whole job | 5.342 | 5.030–5.536 | 0.956 |
| fused-reduction | 65536 | JS RatMath direct | 160.937 | 160.867–160.949 | — |
| fused-reduction | 65536 | JS fused + denominator-aware sum | 41.206 | 41.122–41.893 | — |
| fused-reduction | 65536 | Native GMP whole job | 57.331 | 57.134–59.140 | 16.121 |

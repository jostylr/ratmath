# Benchmark results

Runtime: node 26.10.0; Apple M4 Pro; 256 values/batch; 9 samples.

| Workload | Variant | Median ms/batch | Min–max | Speedup vs IR |
|---|---|---:|---:|---:|
| integer-small | interpreted IR | 0.4930 | 0.4696–0.5577 | 1.00× |
| integer-small | JS runtime translation (recreated) | 0.3737 | 0.3656–0.4212 | 1.32× |
| integer-small | JS runtime + hoisted literals | 0.2660 | 0.2610–0.2725 | 1.85× |
| integer-small | JS direct methods | 0.0182 | 0.0178–0.0185 | 27.16× |
| integer-small | hand JS RatMath | 0.0136 | 0.0134–0.0138 | 36.38× |
| integer-small | JS specialized BigInt boxed | 0.0024 | 0.0024–0.0025 | 201.77× |
| integer-small | JS specialized BigInt raw | 0.0021 | 0.0020–0.0021 | 239.08× |
| integer-small | JS guarded Number boxed | 0.0054 | 0.0053–0.0055 | 91.65× |
| integer-small | hand JS Number raw | 0.0013 | 0.0013–0.0013 | 388.46× |
| integer-small | hand JS i32 batch raw | 0.0002 | 0.0002–0.0004 | 2047.28× |
| integer-small | Wasm i32 scalar boxed | 0.0033 | 0.0030–0.0038 | 151.51× |
| integer-small | Wasm i32 scalar raw | 0.0017 | 0.0017–0.0018 | 288.12× |
| integer-small | Wasm i32 batch raw | 0.0003 | 0.0003–0.0003 | 1640.57× |
| integer-160bit | interpreted IR | 0.4656 | 0.4519–0.4715 | 1.00× |
| integer-160bit | JS runtime translation (recreated) | 0.3788 | 0.3735–0.3831 | 1.23× |
| integer-160bit | JS runtime + hoisted literals | 0.2719 | 0.2669–0.2777 | 1.71× |
| integer-160bit | JS direct methods | 0.0210 | 0.0208–0.0213 | 22.20× |
| integer-160bit | hand JS RatMath | 0.0155 | 0.0154–0.0159 | 29.98× |
| integer-160bit | JS specialized BigInt boxed | 0.0129 | 0.0127–0.0130 | 36.14× |
| integer-160bit | JS specialized BigInt raw | 0.0125 | 0.0124–0.0126 | 37.33× |
| rational-small | interpreted IR | 0.6344 | 0.6200–0.6450 | 1.00× |
| rational-small | JS runtime translation (recreated) | 0.5415 | 0.5366–0.5535 | 1.17× |
| rational-small | JS runtime + hoisted literals | 0.4304 | 0.4244–0.4408 | 1.47× |
| rational-small | JS direct methods | 0.1579 | 0.1556–0.1618 | 4.02× |
| rational-small | hand JS RatMath | 0.1388 | 0.1379–0.1420 | 4.57× |
| rational-small | JS fused rational one normalization | 0.0265 | 0.0262–0.0268 | 23.98× |
| rational-small | JS algebraic rational (x+1)^2 | 0.0263 | 0.0259–0.0270 | 24.10× |
| rational-128bit | interpreted IR | 1.8912 | 1.8755–1.9514 | 1.00× |
| rational-128bit | JS runtime translation (recreated) | 1.7968 | 1.7606–1.8348 | 1.05× |
| rational-128bit | JS runtime + hoisted literals | 1.6605 | 1.6396–1.7046 | 1.14× |
| rational-128bit | JS direct methods | 1.3963 | 1.3797–1.4168 | 1.35× |
| rational-128bit | hand JS RatMath | 1.3612 | 1.3488–1.3852 | 1.39× |
| rational-128bit | JS fused rational one normalization | 0.3139 | 0.3092–0.3158 | 6.02× |
| rational-128bit | JS algebraic rational (x+1)^2 | 0.3018 | 0.2982–0.3093 | 6.27× |
| rational-add32 | interpreted IR | 3.8630 | 3.8254–3.9175 | 1.00× |
| rational-add32 | JS runtime translation (recreated) | 3.2550 | 3.2174–3.3576 | 1.19× |
| rational-add32 | JS runtime + hoisted literals | 3.2619 | 3.2180–3.3565 | 1.18× |
| rational-add32 | JS direct methods | 1.2262 | 1.2130–1.2406 | 3.15× |
| rational-add32 | hand JS RatMath | 1.1979 | 1.1925–1.2077 | 3.22× |
| rational-add32 | JS fixed denominator one normalization | 0.0366 | 0.0364–0.0368 | 105.57× |
| interval-polynomial | interpreted IR | 0.8683 | 0.8566–0.8837 | 1.00× |
| interval-polynomial | JS runtime translation (recreated) | 0.7787 | 0.7675–0.7930 | 1.11× |
| interval-polynomial | JS runtime + hoisted literals | 0.6640 | 0.6539–0.6758 | 1.31× |
| interval-polynomial | JS direct methods | 0.3738 | 0.3695–0.3773 | 2.32× |
| interval-polynomial | hand JS RatMath | 0.3724 | 0.3701–0.3753 | 2.33× |

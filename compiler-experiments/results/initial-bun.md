# Benchmark results

Runtime: bun 1.4.0; Apple M4 Pro; 256 values/batch; 9 samples.

| Workload | Variant | Median ms/batch | Min–max | Speedup vs IR |
|---|---|---:|---:|---:|
| integer-small | interpreted IR | 0.3134 | 0.2945–0.3291 | 1.00× |
| integer-small | JS runtime translation (recreated) | 0.2252 | 0.2057–0.2364 | 1.39× |
| integer-small | JS runtime + hoisted literals | 0.1689 | 0.1513–0.1778 | 1.86× |
| integer-small | JS direct methods | 0.0093 | 0.0081–0.0097 | 33.59× |
| integer-small | hand JS RatMath | 0.0128 | 0.0106–0.0131 | 24.51× |
| integer-small | JS specialized BigInt boxed | 0.0085 | 0.0072–0.0087 | 36.72× |
| integer-small | JS specialized BigInt raw | 0.0075 | 0.0066–0.0079 | 41.57× |
| integer-small | JS guarded Number boxed | 0.0043 | 0.0038–0.0047 | 73.36× |
| integer-small | hand JS Number raw | 0.0010 | 0.0010–0.0011 | 299.39× |
| integer-small | hand JS i32 batch raw | 0.0002 | 0.0002–0.0002 | 1622.69× |
| integer-small | Wasm i32 scalar boxed | 0.0042 | 0.0037–0.0043 | 75.26× |
| integer-small | Wasm i32 scalar raw | 0.0016 | 0.0016–0.0017 | 193.92× |
| integer-small | Wasm i32 batch raw | 0.0002 | 0.0002–0.0002 | 1869.80× |
| integer-160bit | interpreted IR | 0.3125 | 0.3085–0.3252 | 1.00× |
| integer-160bit | JS runtime translation (recreated) | 0.2198 | 0.2150–0.2261 | 1.42× |
| integer-160bit | JS runtime + hoisted literals | 0.1655 | 0.1589–0.1680 | 1.89× |
| integer-160bit | JS direct methods | 0.0129 | 0.0125–0.0136 | 24.17× |
| integer-160bit | hand JS RatMath | 0.0154 | 0.0150–0.0163 | 20.31× |
| integer-160bit | JS specialized BigInt boxed | 0.0119 | 0.0115–0.0124 | 26.18× |
| integer-160bit | JS specialized BigInt raw | 0.0107 | 0.0104–0.0111 | 29.19× |
| rational-small | interpreted IR | 0.4503 | 0.4339–0.4669 | 1.00× |
| rational-small | JS runtime translation (recreated) | 0.3531 | 0.3353–0.3664 | 1.28× |
| rational-small | JS runtime + hoisted literals | 0.2980 | 0.2888–0.3077 | 1.51× |
| rational-small | JS direct methods | 0.1304 | 0.1232–0.1381 | 3.45× |
| rational-small | hand JS RatMath | 0.1110 | 0.1037–0.1147 | 4.06× |
| rational-small | JS fused rational one normalization | 0.0362 | 0.0340–0.0368 | 12.45× |
| rational-small | JS algebraic rational (x+1)^2 | 0.0293 | 0.0278–0.0300 | 15.37× |
| rational-128bit | interpreted IR | 0.9413 | 0.8790–1.0016 | 1.00× |
| rational-128bit | JS runtime translation (recreated) | 0.8288 | 0.8013–0.8505 | 1.14× |
| rational-128bit | JS runtime + hoisted literals | 0.7730 | 0.7388–0.7984 | 1.22× |
| rational-128bit | JS direct methods | 0.6160 | 0.5922–0.6251 | 1.53× |
| rational-128bit | hand JS RatMath | 0.5862 | 0.5549–0.6033 | 1.61× |
| rational-128bit | JS fused rational one normalization | 0.1576 | 0.1472–0.1685 | 5.97× |
| rational-128bit | JS algebraic rational (x+1)^2 | 0.1418 | 0.1348–0.1513 | 6.64× |
| rational-add32 | interpreted IR | 2.9696 | 2.7449–3.1294 | 1.00× |
| rational-add32 | JS runtime translation (recreated) | 2.2326 | 2.1625–2.3548 | 1.33× |
| rational-add32 | JS runtime + hoisted literals | 2.2318 | 2.1192–2.3161 | 1.33× |
| rational-add32 | JS direct methods | 0.9630 | 0.8771–0.9969 | 3.08× |
| rational-add32 | hand JS RatMath | 0.9873 | 0.9137–1.0303 | 3.01× |
| rational-add32 | JS fixed denominator one normalization | 0.0728 | 0.0674–0.0780 | 40.80× |
| interval-polynomial | interpreted IR | 0.7214 | 0.6923–0.7526 | 1.00× |
| interval-polynomial | JS runtime translation (recreated) | 0.6291 | 0.5712–0.6741 | 1.15× |
| interval-polynomial | JS runtime + hoisted literals | 0.5701 | 0.5093–0.5948 | 1.27× |
| interval-polynomial | JS direct methods | 0.4037 | 0.3430–0.4371 | 1.79× |
| interval-polynomial | hand JS RatMath | 0.4054 | 0.3511–0.4300 | 1.78× |

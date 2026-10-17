# Tuned RiX compilation — node

24 powers, 2048-bit modulus, 1024-bit exponent; 5 measured rounds, 2 warmups.

| Path | Median ms | Min–max ms | Speedup vs binary RiX |
|---|---:|---:|---:|
| interpreted binary RiX | 4833.161 | 4802.496–4852.015 | 1.00× |
| interpreted window RiX | 3841.655 | 3815.820–3857.923 | 1.26× |
| interpreted Montgomery RiX | 7899.122 | 7883.524–7927.000 | 0.61× |
| binary RiX + Integer fastpaths | 182.051 | 180.570–182.461 | 26.55× |
| window RiX + Integer fastpaths | 222.439 | 218.534–234.073 | 21.73× |
| Montgomery RiX + Integer fastpaths | 585.136 | 581.380–597.973 | 8.26× |
| compiled window RiX | 76.840 | 76.072–77.144 | 62.90× |
| compiled Montgomery RiX | 42.782 | 42.535–42.966 | 112.97× |
| handwritten window-6 JS | 75.233 | 75.085–75.996 | 64.24× |
| handwritten Montgomery-5 JS | 40.438 | 39.983–40.756 | 119.52× |
| native C/GMP powm | 15.632 | 15.495–15.690 | 309.18× |
| RiX calls cached compiled kernel | 42.816 | 42.656–43.258 | 112.88× |
| compiled Montgomery without power facts | 216.955 | 216.321–217.932 | 22.28× |

All paths return sequences of exact RatMath Integers; every batch is checked outside timing. Exponent schedule, power tables and Montgomery state are prepared inside each call. Native uses GMP powm rather than the same window/Montgomery implementation.

First call from RiX to the managed compiled capability: 48.421 ms including compilation (1.182 ms) and import (0.351 ms). Warm calls reuse a single compiled module. Native preparation: 87.504 ms; cache=true.

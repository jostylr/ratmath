# Tuned RiX compilation — bun

24 powers, 2048-bit modulus, 1024-bit exponent; 5 measured rounds, 2 warmups.

| Path | Median ms | Min–max ms | Speedup vs binary RiX |
|---|---:|---:|---:|
| interpreted binary RiX | 1666.139 | 1622.279–1698.622 | 1.00× |
| interpreted window RiX | 1380.974 | 1375.566–1425.055 | 1.21× |
| interpreted Montgomery RiX | 3088.952 | 3042.364–3108.181 | 0.54× |
| binary RiX + Integer fastpaths | 94.174 | 93.715–97.063 | 17.69× |
| window RiX + Integer fastpaths | 155.442 | 150.665–159.790 | 10.72× |
| Montgomery RiX + Integer fastpaths | 444.214 | 434.315–450.930 | 3.75× |
| compiled window RiX | 25.900 | 25.387–26.006 | 64.33× |
| compiled Montgomery RiX | 41.564 | 40.006–42.236 | 40.09× |
| handwritten window-6 JS | 23.727 | 23.626–24.074 | 70.22× |
| handwritten Montgomery-5 JS | 37.777 | 37.412–40.470 | 44.10× |
| native C/GMP powm | 21.970 | 21.528–22.483 | 75.84× |
| RiX calls cached compiled kernel | 25.925 | 25.526–26.768 | 64.27× |
| compiled Montgomery without power facts | 148.960 | 146.362–152.065 | 11.19× |

All paths return sequences of exact RatMath Integers; every batch is checked outside timing. Exponent schedule, power tables and Montgomery state are prepared inside each call. Native uses GMP powm rather than the same window/Montgomery implementation.

First call from RiX to the managed compiled capability: 32.443 ms including compilation (1.401 ms) and import (0.388 ms). Warm calls reuse a single compiled module. Native preparation: 81.868 ms; cache=true.

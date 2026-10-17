# Combined polynomial operations in fast core — bun

7 rounds, 2 warmups. Milliseconds per full point batch; all paths use the same copied fast core.

## integer-horner

Degree 32, 32 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 2.8358 | 1.00× |
| JS Horner, same methods | 0.0311 | 91.17× |
| RiX combined per point | 0.0506 | 56.10× |
| RiX fused per point | 0.0485 | 58.41× |
| RiX combined batch | 0.0319 | 88.82× |
| RiX fused batch | 0.0303 | 93.54× |
| JS fused batch | 0.0291 | 97.40× |

## rational-horner

Degree 16, 16 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 2.7883 | 1.00× |
| JS Horner, same methods | 0.2128 | 13.10× |
| RiX combined per point | 0.2314 | 12.05× |
| RiX fused per point | 0.2130 | 13.09× |
| RiX combined batch | 0.2160 | 12.91× |
| RiX fused batch | 0.2000 | 13.94× |
| JS fused batch | 0.1960 | 14.23× |

## rational-coefficients-horner

Degree 16, 16 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 2.9716 | 1.00× |
| JS Horner, same methods | 0.2654 | 11.20× |
| RiX combined per point | 0.2786 | 10.67× |
| RiX fused per point | 0.2616 | 11.36× |
| RiX combined batch | 0.2628 | 11.31× |
| RiX fused batch | 0.2448 | 12.14× |
| JS fused batch | 0.2408 | 12.34× |

## larger-rational-horner

Degree 32, 8 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 13.9078 | 1.00× |
| JS Horner, same methods | 0.6557 | 21.21× |
| RiX combined per point | 0.6732 | 20.66× |
| RiX fused per point | 0.6380 | 21.80× |
| RiX combined batch | 0.6475 | 21.48× |
| RiX fused batch | 0.6265 | 22.20× |
| JS fused batch | 0.6260 | 22.22× |

## zero-rational-horner

Degree 128, 4 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 1.4380 | 1.00× |
| JS Horner, same methods | 0.0530 | 27.11× |
| RiX combined per point | 0.0574 | 25.06× |
| RiX fused per point | 0.0222 | 64.66× |
| RiX combined batch | 0.0531 | 27.06× |
| RiX fused batch | 0.0191 | 75.34× |
| JS fused batch | 0.0184 | 78.07× |

## interval-horner

Degree 8, 8 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 0.3249 | 1.00× |
| JS Horner, same methods | 0.0638 | 5.09× |
| RiX combined per point | 0.0703 | 4.62× |
| RiX fused per point | 0.0704 | 4.62× |
| RiX combined batch | 0.0637 | 5.10× |
| RiX fused batch | 0.0637 | 5.10× |
| JS fused batch | 0.0628 | 5.17× |

## rational-coefficients-integer-points

Degree 16, 32 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 1.9406 | 1.00× |
| JS Horner, same methods | 0.1643 | 11.81× |
| RiX combined per point | 0.1864 | 10.41× |
| RiX fused per point | 0.1451 | 13.38× |
| RiX combined batch | 0.1651 | 11.76× |
| RiX fused batch | 0.1286 | 15.09× |
| JS fused batch | 0.1243 | 15.62× |

## constant-rational-polynomial

Degree 0, 16 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 0.1002 | 1.00× |
| JS Horner, same methods | 0.0024 | 42.01× |
| RiX combined per point | 0.0120 | 8.35× |
| RiX fused per point | 0.0112 | 8.91× |
| RiX combined batch | 0.0029 | 34.73× |
| RiX fused batch | 0.0023 | 44.09× |
| JS fused batch | 0.0018 | 55.89× |

Combined method paths remove interpreter work inside Horner. Fused paths additionally remove intermediate Integer/Rational wrappers while using the same stepwise reduced multiply/add kernel. Batch paths remove per-point RiX traversal/calls. JS paths expose the remaining host-boundary overhead. There is no changed polynomial algorithm, delayed fraction normalization, leading-zero pruning, compilation, native code or cached preparation.

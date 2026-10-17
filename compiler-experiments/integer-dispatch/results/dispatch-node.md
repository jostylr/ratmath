# Integer dispatch — node 26.12.0

Median milliseconds per full batch. Base already includes the previous Rational-copy/literal fixes.

## integer-horner

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 3.1992 | 1.00× |
| methods | 2.6271 | 1.22× |
| dispatch | 3.0115 | 1.06× |
| both | 2.5700 | 1.24× |
| comparisons | 2.5506 | 1.25× |

## integer-accumulator

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 2.7169 | 1.00× |
| methods | 2.4902 | 1.09× |
| dispatch | 2.4527 | 1.11× |
| both | 2.4162 | 1.12× |
| comparisons | 2.4369 | 1.11× |

## integer-comparisons

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 2.1479 | 1.00× |
| methods | 1.9931 | 1.08× |
| dispatch | 1.9948 | 1.08× |
| both | 1.9824 | 1.08× |
| comparisons | 1.9685 | 1.09× |

## len-get-sum

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 1.2683 | 1.00× |
| methods | 1.0277 | 1.23× |
| dispatch | 1.2058 | 1.05× |
| both | 1.0027 | 1.26× |
| comparisons | 1.0114 | 1.25× |

## custom-Get-sum

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 1.2358 | 1.00× |
| methods | 0.9824 | 1.26× |
| dispatch | 1.1838 | 1.04× |
| both | 0.9913 | 1.25× |
| comparisons | 0.9836 | 1.26× |

## custom-ADD-accumulator

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 1.3954 | 1.00× |
| methods | 1.2560 | 1.11× |
| dispatch | 1.2827 | 1.09× |
| both | 1.2760 | 1.09× |
| comparisons | 1.3067 | 1.07× |

## rational-horner

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 1.2184 | 1.00× |
| methods | 1.0756 | 1.13× |
| dispatch | 1.1953 | 1.02× |
| both | 1.0904 | 1.12× |
| comparisons | 1.0728 | 1.14× |

## interval-horner

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 0.3398 | 1.00× |
| methods | 0.3123 | 1.09× |
| dispatch | 0.3541 | 0.96× |
| both | 0.3093 | 1.10× |
| comparisons | 0.3175 | 1.07× |

## larger-rational-horner

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 2.7278 | 1.00× |
| methods | 2.5828 | 1.06× |
| dispatch | 2.7358 | 1.00× |
| both | 2.5927 | 1.05× |
| comparisons | 2.5952 | 1.05× |

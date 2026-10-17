# Integer dispatch — bun 1.4.3

Median milliseconds per full batch. Base already includes the previous Rational-copy/literal fixes.

## integer-horner

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 2.6375 | 1.00× |
| methods | 2.3025 | 1.15× |
| dispatch | 2.6105 | 1.01× |
| both | 2.2031 | 1.20× |
| comparisons | 2.1482 | 1.23× |

## integer-accumulator

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 1.8834 | 1.00× |
| methods | 1.9748 | 0.95× |
| dispatch | 1.8577 | 1.01× |
| both | 1.9391 | 0.97× |
| comparisons | 1.9426 | 0.97× |

## integer-comparisons

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 1.7007 | 1.00× |
| methods | 1.7104 | 0.99× |
| dispatch | 1.6181 | 1.05× |
| both | 1.6618 | 1.02× |
| comparisons | 1.5556 | 1.09× |

## len-get-sum

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 1.0348 | 1.00× |
| methods | 0.8924 | 1.16× |
| dispatch | 1.0576 | 0.98× |
| both | 0.8782 | 1.18× |
| comparisons | 0.7786 | 1.33× |

## custom-Get-sum

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 1.0742 | 1.00× |
| methods | 0.9018 | 1.19× |
| dispatch | 1.0544 | 1.02× |
| both | 0.8741 | 1.23× |
| comparisons | 0.8272 | 1.30× |

## custom-ADD-accumulator

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 1.1095 | 1.00× |
| methods | 1.0705 | 1.04× |
| dispatch | 1.1158 | 0.99× |
| both | 1.0709 | 1.04× |
| comparisons | 1.0500 | 1.06× |

## rational-horner

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 1.0328 | 1.00× |
| methods | 0.9456 | 1.09× |
| dispatch | 1.0036 | 1.03× |
| both | 0.8895 | 1.16× |
| comparisons | 0.8533 | 1.21× |

## interval-horner

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 0.2928 | 1.00× |
| methods | 0.2761 | 1.06× |
| dispatch | 0.3009 | 0.97× |
| both | 0.2606 | 1.12× |
| comparisons | 0.2511 | 1.17× |

## larger-rational-horner

| Variant | Median ms | Speedup vs base |
|---|---:|---:|
| base | 1.3766 | 1.00× |
| methods | 1.3446 | 1.02× |
| dispatch | 1.4534 | 0.95× |
| both | 1.3324 | 1.03× |
| comparisons | 1.2560 | 1.10× |

# Interpreter overhead — node

Times are milliseconds per full point batch. Same fast core; original RiX source unless labeled otherwise.

## integer-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 3.2837 | 1.00× |
| copy | 3.1753 | 1.03× |
| literals | 2.8282 | 1.16× |
| literals + RiX hoisted Len | 2.5132 | 1.31× |
| JS Horner, same core methods | 0.0344 | 95.32× |

## rational-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 6.8991 | 1.00× |
| copy | 1.2571 | 5.49× |
| literals | 1.1478 | 6.01× |
| literals + RiX hoisted Len | 1.0498 | 6.57× |
| JS Horner, same core methods | 0.3170 | 21.76× |

## rational-coefficients-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 7.0448 | 1.00× |
| copy | 1.2922 | 5.45× |
| literals | 1.1738 | 6.00× |
| literals + RiX hoisted Len | 1.0804 | 6.52× |
| JS Horner, same core methods | 0.3589 | 19.63× |

## larger-rational-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 40.9945 | 1.00× |
| copy | 2.6715 | 15.35× |
| literals | 2.5501 | 16.08× |
| literals + RiX hoisted Len | 2.4719 | 16.58× |
| JS Horner, same core methods | 1.7245 | 23.77× |

## zero-rational-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 1.6242 | 1.00× |
| copy | 1.6720 | 0.97× |
| literals | 1.5417 | 1.05× |
| literals + RiX hoisted Len | 1.3916 | 1.17× |
| JS Horner, same core methods | 0.0775 | 20.97× |

## interval-horner

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 0.3322 | 1.00× |
| copy | 0.3405 | 0.98× |
| literals | 0.3039 | 1.09× |
| literals + RiX hoisted Len | 0.2830 | 1.17× |
| JS Horner, same core methods | 0.0630 | 5.27× |

## rational-coefficients-integer-points

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 1.9866 | 1.00× |
| copy | 2.0062 | 0.99× |
| literals | 1.8297 | 1.09× |
| literals + RiX hoisted Len | 1.6619 | 1.20× |
| JS Horner, same core methods | 0.1829 | 10.86× |

## constant-rational-polynomial

| Path | Median ms | Speedup vs unchanged interpreter |
|---|---:|---:|
| control | 0.1077 | 1.00× |
| copy | 0.1091 | 0.99× |
| literals | 0.0970 | 1.11× |
| literals + RiX hoisted Len | 0.0947 | 1.14× |
| JS Horner, same core methods | 0.0039 | 27.66× |

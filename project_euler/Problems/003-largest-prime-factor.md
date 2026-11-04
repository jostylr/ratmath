# Problem 3: Largest prime factor

## The problem

The prime factors of 13195 are 5, 7, 13 and 29. What is the largest prime
factor of 600851475143?

Source: [Project Euler problem 3](https://projecteuler.net/problem=3).

## Small experiments

Check the statement first: the four primes multiply back to 13195, and
`{* ... }` is an n-ary product.

```rix edu
{* 5, 7, 13, 29 } ##@ == 13195;
```

To find factors rather than check them, try divisors in increasing order.
The smallest divisor above 1 of any number is prime, so dividing it out and
repeating peels off primes one at a time. By hand for 13195:

```rix edu
13195 % 2;
13195 % 3;
13195 % 5;
13195 / 5;
2639 % 5;
2639 % 7;
2639 / 7;
```

After removing 5 and 7 we are left with 377, and we never need to retry a
smaller divisor. There is also a natural stopping point: if the divisor $d$
satisfies $d^2 > n$, then what is left of $n$ has no divisor up to its square
root, so it is itself prime.

## General solution

`Factors(n, d, found)` carries the remaining number, the current trial
divisor and the primes found so far. A case block `{? ... }` picks the first
condition that holds. `$(...)` is a tail call to the current function; it
reuses the stack frame, so the recursion can run as long as it needs.

```rix edu
Factors(n, d, found) -> {?
    n == 1 ? found;
    d * d > n ? found.Push(n);
    n % d == 0 ? $(n / d, d, found.Push(d));
    $(n, d + 1, found)
};
PrimeFactors(n) -> Factors(n, 2, []);
PrimeFactors(13195);
PrimeFactors(13195).Join(" ") ##@ == "5 7 13 29";
```

A few more checks, including repeated factors, a prime, and 1.

```rix edu
PrimeFactors(360).Join(" ") ##@ == "2 2 2 3 3 5";
PrimeFactors(97).Join(" ") ##@ == "97";
PrimeFactors(1).Len() ##@ == 0;
wrong := [2, 12, 97, 360, 13195, 99999] |>? (n) -> (PrimeFactors(n) |:> 1 >: @*[2]) != n;
wrong.Len() ##@ == 0;
```

The last two lines multiply each factor list back together and keep any
number whose product does not match; none do. (Lists are asserted through
their joined text because `==` on arrays tests identity, not contents.)

Now the real input. Dividing out each prime as it is found keeps the search
short: the divisor never has to pass the square root of what remains.

```rix edu
PrimeFactors(600851475143);
```

## Answer

Factors are found in increasing order, so the largest is the last one.

```rix edu
LargestPrimeFactor(n) -> PrimeFactors(n).Last();
LargestPrimeFactor(13195) ##@ == 29;
answer := LargestPrimeFactor(600851475143);
answer ##@ == 6857;
```

The largest prime factor of 600851475143 is **@{answer}**.

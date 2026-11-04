# Problem 2: Even Fibonacci numbers

## The problem

Each new term of the Fibonacci sequence is the sum of the previous two.
Starting with 1 and 2, the first ten terms are

$$1, 2, 3, 5, 8, 13, 21, 34, 55, 89.$$

Considering the terms that do not exceed four million, find the sum of the
even-valued terms.

Source: [Project Euler problem 2](https://projecteuler.net/problem=2).

## Small experiments

RiX can describe a sequence by its seeds and a rule. Inside brackets, `|>`
generates the next value from the history, newest first, so `@+(_1, _2)` adds
the two most recent terms. With no stopping clause the sequence is lazy and
unbounded; slicing asks for only what we need.

```rix edu
fib := [1, 2, |> @+(_1, _2)];
fib[1:10];
fib[1:10].Join(" ") ##@ == "1 2 3 5 8 13 21 34 55 89";
```

That matches the ten terms in the statement. (Arrays are compared here
through their joined text, because `==` on two arrays tests identity rather
than contents.) The eager stop `|; predicate`
ends the list at the first value where the predicate holds. Note that the
value which triggers the stop is kept.

```rix edu
[1, 2, |> @+(_1, _2), |; (x) -> x > 100];
```

144 is over the bound, so a filter has to remove it. For the bound 100 the
even terms are 2, 8 and 34.

```rix edu
upTo100 := [1, 2, |> @+(_1, _2), |; (x) -> x > 100] |>? (x) -> x <= 100;
evens := upTo100 |>? (x) -> x % 2 == 0;
evens |>: @+[2] ##@ == 44;
```

## General solution

The same three steps, with the bound as a parameter: generate, trim, keep the
even terms, and add.

```rix edu
FibsUpTo(limit) -> [1, 2, |> @+(_1, _2), |; (x) -> x > limit] |>? (x) -> x <= limit;
EvenFibSum(limit) -> FibsUpTo(limit) |>? ((x) -> x % 2 == 0) |:> 0 >: @+[2];
EvenFibSum(100) ##@ == 44;
EvenFibSum(4000000);
```

## Looking closer: every third term

The parities repeat as odd, even, odd, odd, even, odd, and so on, so the even
terms are every third one. Listing their positions confirms it.

```rix edu
fib[1:15] |>> (x, position) -> x % 2 == 0 ?: position ?_ 0;
```

Even terms sit at positions 2, 5, 8, 11, 14. They also satisfy their own
recurrence $E_n = 4E_{n-1} + E_{n-2}$, which lets us skip the odd terms
entirely. In a two-parameter history rule the first parameter is the newest
term.

```rix edu
evenFib := [2, 8, |> (newest, older) -> 4 * newest + older];
evenFib[1:6];
EvenFibSumFast(limit) -> [2, 8, |> (newest, older) -> 4 * newest + older, |; (x) -> x > limit] |>? ((x) -> x <= limit) |:> 0 >: @+[2];
disagreements := [1, 2, 10, 100, 4000000, 10^30] |>? (limit) -> EvenFibSum(limit) != EvenFibSumFast(limit);
disagreements.Len() ##@ == 0;
```

## Answer

```rix edu
answer := EvenFibSumFast(4000000);
answer ##@ == 4613732;
```

The even Fibonacci terms not exceeding four million sum to **@{answer}**.

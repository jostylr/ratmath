# Problem 4: Largest palindrome product

## The problem

A palindromic number reads the same in both directions. The largest
palindrome that is a product of two 2-digit numbers is $9009 = 91 \times 99$.
Find the largest palindrome that is a product of two 3-digit numbers.

Source: [Project Euler problem 4](https://projecteuler.net/problem=4).

## Small experiments

A number is a palindrome when its decimal text equals its own reverse.
`ToString` gives the text and the postfix pipe `|><` reverses a sequence.

```rix edu
text := 9009.ToString();
text |><;
IsPalindrome(n) -> {; s := n.ToString(); s == (s |><) };
[9009, 9010, 7, 1221, 1231] |>> IsPalindrome;
```

`1` is true and `_` (null) is false. With only 90 two-digit numbers we can
afford to look at every product for the small case. For each `a`, take every
`b` from `a` to 99, keep the palindromic products, and take the maximum.
Folding with `.MAX` from a starting value of 0 means a row with no
palindromes simply contributes 0.

```rix edu
RowBest(a, hi) -> .IRANGE(a, hi) |>> ((b) -> a * b) |>? IsPalindrome |:> 0 >: @_MAX[2];
RowBest(91, 99);
BruteBest(lo, hi) -> .IRANGE(lo, hi) |>> ((a) -> RowBest(a, hi)) |:> 0 >: @_MAX[2];
BruteBest(10, 99) ##@ == 9009;
```

That reproduces the example. The same idea for three digits would test about
400,000 products, most of them far too small to matter.

## General solution: search from the top and prune

Count `a` and `b` downward from the largest value, and remember the best
palindrome so far. Two observations cut the work:

- for a fixed `a`, once `a * b` is no bigger than the best, smaller `b` cannot help;
- once even `a * hi` is no bigger than the best, no smaller `a` can help.

Both loops use the five-part form `{@ init; condition; body; update; after }`
where `after` supplies the result. `{@::@` removes the default cap on
iterations. Loop variables are created with `:=` so that each is a fresh
copy; a plain `=` would make `b` an alias of `hi`, and counting `b` down
would drag `hi` down with it.

```rix edu
BestWith(a, hi, best) -> {@::@ b := hi; b >= a && a * b > best; IsPalindrome(a * b) ?: (best := a * b); b -= 1; best };
Largest(lo, hi) -> {@::@ a := hi, best := 0; a >= lo && a * hi > best; best := BestWith(a, hi, best); a -= 1; best };
Largest(10, 99) ##@ == 9009;
BestWith(91, 99, 0) ##@ == 9009;
```

The pruned search agrees with brute force on the two-digit case. It also
agrees on other small ranges, checked both ways:

```rix edu
ranges := [{: 1, 9 }, {: 10, 99 }, {: 20, 60 }, {: 50, 80 }];
ranges |>> (r) -> {: Largest(r[1], r[2]), BruteBest(r[1], r[2]) };
(ranges |>? (r) -> Largest(r[1], r[2]) != BruteBest(r[1], r[2])).Len() ##@ == 0;
```

## A structural aside

A six-digit palindrome has digits $abccba$, which is
$100001a + 10010b + 1100c$. Each coefficient is a multiple of 11:

```rix edu
[100001, 10010, 1100] |>> (n) -> n % 11;
```

So the answer must be divisible by 11, and since 11 is prime one of the two
factors must be too. We can confirm that on the result below.

## Answer

```rix edu
answer := Largest(100, 999);
answer ##@ == 906609;
answer % 11 ##@ == 0;
913 * 993 ##@ == 906609;
913 % 11 ##@ == 0;
```

The largest palindrome made from two 3-digit factors is **@{answer}**,
which is $913 \times 993$.

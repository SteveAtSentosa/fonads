# Functional Monads

## Monad Primitives

These have concrete implementations

|              | Just               | Nothing       | Fault       | Ok          |
|-------------:|--------------------|---------------|-------------|-------------|
| abbrev       | J                  | N             | F           | O           |
| map          | f->J[a]->J[f(a)]   | -> self       | -> self     | -> self     |
| chain        | f->J[a]->f(a)      | -> self       | -> self     | -> self     |
| ap           | TBD                | -> self       | -> self     | -> self     |
|-------------:|--------------------|---------------|-------------|-------------|
| extract      | J[a]: -> a         | -> null       | -> msg      | -> msg      |
| hasMsg       | No                 | No            | Yes         | Yes         |


NOTE: A Fault maybe F or an array of F's, the later representing a fault stack which captures
multiple errors generated during an operation.  Anywhere in documentation that `F` is
used, that means F | [F]

## Mondad Constructs (better name?)

Value Monad

* abbreviation: `V`
* V = N | J | F

Status Monad

* abbreviation: `S`
* S = O | F

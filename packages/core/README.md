# Monad Primitives

These have concrete implementations across all monads

|              | Just               | Nothing       | Fault         | Ok             |
|-------------:|--------------------|---------------|---------------|----------------|
| abbreviation | J                  | N             | F             | O              |
| map          | f->J[a]->J[f(a)]   | -> self       | -> self       | -> self        |
| chain        | f->J[a]->f(a)      | -> self       | -> self       | -> self        |
| ap           | TBD                | -> self       | -> self       | -> self        |
| extract      | J[a] -> a          | -> null       | -> fault msg  | -> success msg |
| status       | 'Valid J'          | -> 'Valid N'  | -> fault msg  | -> success msg |
| addNote      | y                  | y             | y             | y              |

# Monad Constructs (Unions)

Value Monad

* abbreviation: V
* V = N | J | F

Status Monad

* abbreviation: S
* S = O | F

Functional Monad

* abbreviation: M / fm
* M = V | S


Talk about relaxed (i.e. can take in FM or raw value, and still works)





SOME CONVENTIONS
There is a focus on last arg of a call
fonad utils always accepts fm as last arg, or will wrap last arg into Just()
 .. talk about and think about this a bit more


 Think about ifCondition vs pred

 mapMethodIf
 mapMethodIfPred

 vs

 mapMethodIfCondition
 mapMethodIf
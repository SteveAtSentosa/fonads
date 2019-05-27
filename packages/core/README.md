# Monad Primitives

These have concrete implementations across all monads

### Standard monadic interface

|              | Just                  | Nothing       | Fault             | Ok             | Non FM           |
|-------------:|-----------------------|---------------|-------------------|----------------|------------------|
| abbreviation | J                     | N             | F                 | O              | a                |
| map          | f->J[a]->J[f(a)]      | -> self       | -> self           | -> self        | f->a->J[f(a)]    |
| chain        | f->J[a]->f(a)         | -> self       | -> self           | -> self        | f->a-> f(a)      |
| ap           | J1[f]->J2[a]->J[f(a)] | -> self       | -> self           | -> self        | f]->a->J[f(a)]   |


### Extended monadic interface (convenience fxns)

|              | Just                  | Nothing       | Fault             | Ok             | Non FM           |
|-------------:|-----------------------|---------------|-------------------|----------------|------------------|
| extract      | J[a] -> a             | -> null       | -> false          | -> true        | a -> a           |
| inspect      | J[a] -> stringify(a)  | -> 'Nothing'  | -> 'F(fault msg)' | -> 'Ok()'      | -> 'Non FM'      |
| statusMsg    |                       |               |                   |                |                  |
| addNote      | y                     | y             | y                 | y              | y                |


### Async monadic interface

|              | Just                     | Nothing       | Fault             | Ok             | Non FM            |
|-------------:|--------------------------|---------------|-------------------|----------------|-------------------|
| mapAsync     | af->J[a]->P(J[fa(a)])    | -> self       | -> self           | -> self        | f->as->P(J[f(a)]) |
| chainAsync   | af->J[a]->P(af(a))       | -> self       | -> self           | -> self        | f->a-> P(f(a))    |
| apAsync      | J1[f]->J2[a]->P(J[f(a)]) | -> self       | -> self           | -> self        | f]->a->P(J[f(a)]) |


### Monads interface for class instantiations

i.e. the value held by a monad is a class instantiation





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

# Key Concepts


## Relaxed monadic functions

All functions in the fonad library that accept a monad can accommodate a raw value as well,
i.e. any argument documented as accepting an fm (J[v] in non error cases), can also accept the raw value (v).

In order to make this clear, a '$' will be prepended to any input fm arguments, for example `doSomething($fm)`.
$fm indicates that the function will handle either an fm (Just in non error cases) or a raw value.

In all cases, responses are wrapped in a Just

## Monadic Pipelines

The whole job of monads (at least within the fonad library) is to make function pipelining (aka composition)
straight forward and bullet proof in the face of errors and exceptions.  Fonaid function are meant to
be used in function pipelines.  In fact, it is entirely possible that functions created using the fonad
library will consist of nothing other then a function pipeline.

TBD: examples

## Trailing Monad

Functions in the fonad library are designed specifically to be used in monadic pipelines.
Within a pipeline, the last argument of any function within the pipeline will be monadic (i.e. fm).

We will call that argument of a function, build to work within a pipeline, the trailing monad.

At it's core, the trailing monad is the entire point of monadic error handling.  If one function
succeeds, it passes a Just(result) to the next function, if it fails, it passes a Fault() to
the next functions.  Fault monadic functions, just as map() and chain(), do nothing but return
the Fault itself.  This allows a Fault to bubble to the bottom of a functional pipeline, with
no furtner operations taking place, for proper reporting


## Fault reflective

All function in the fonad library are Fault Reflective.  This means, in all cases, if the last argument
accepted by a function is a Fault, then that Fault will be immediately returned, and the function does nothing.

This approach Facilitates Fault flow-throw in functional pipelines, and is essentially a short cut for
map / mapAsycn

The key letters `FR` are used in function documentation to indicate fault reflectivity


### Exception safe

Talk about fonad functions wrapping all supplied functions (for map, chain, etc) in try catch, and
if exception is thrown, it is caught, and corresponding fault is returnd


### Passthrough functions

Sometime you would like for a function to be called within a pipeline

## Fault or Pass through

Sometimes a monadic function, may do nothing more than validate incoming values (usually the trailing monad).

If the input is valid then the trailing monad is simply passed through (so that it can happily be passed
to the next function in the pipeline.  If one of the inputs being validated is not valid, then a Fault
will be generated, and returned.  This type of function is known as Fault or Passthrough (FOP in function
documentation).

As will all fonad function, if the input is a Fault, it is simply reflected (so that an FOP function can
live happily in a functional pipeline, and will propagate any Faults from above.

## Predicate Function

A predicate function is simply a function that is applied to value, or in our case usually the value contained
by a monad, and returns true or false.

Predicate functions are used to determine that state of a value/monad, usually to check for
conditional action.

## Conditional Actions

Sometimes within a functional pipeline, you may want to apply an action only if a particular condition exists.

The fonad library implements 3 types of conditional checks.

#### Take conditional access based on the fonad type

Example
``` javascript
logMsgOnNonFault('... inserting document into collection'),
```

 A condition may be predicate (true/false fn) applied to the contents of a Monad, or it may just simple be a
javascript statement. (TBD... need better description).

As and example, create a fault if a predicate function applied to content of a monad returns true, like
this: `faultIf(pred, op, errMsg $fm)`

In this case, for $fm[v], if p(v) is true, a Fault will be returned, otherwise, $fm will be returned.

In some cases, a conditional action may be based on a check that does not apply the the
contents of the trailing monad, but rather based on a javascript statement.  The are known
as ifCondition functions, denoted by a capital C 'C' at the end of the function name.  The capital 'C'
postpender is just a reminder that the function takes a condition (i.e. javascript statement that
evaluates to true or fase), as opposed to a predicate function that will be applied to the FM


### Applying async functions to a monad

Talk about returning promise, handling exceptoins, etc

### Working with monads that contain a class instantiation

TBD
talk about mapMethod, mapMethodAsycn (and chain, and ap)


### Currying

All functions within the fonad library are curried allowing any fonad function to be used in a
monadic pipeline.

### Notes

Notes can be added to a monad of any type via `addNote(note, fm)`

### Logging

TBD












 Think about ifCondition vs pred

 mapMethodIf
 mapMethodIfPred

 vs

 mapMethodIfCondition
 mapMethodIf
// TODO
// * allow loggers to be passed in for logging?

import { curry, propEq, complement, isNil, drop, pipe, keys } from 'ramda'
import { isObject, isFunction, isNotFunction, isNotObject, isArray } from 'ramda-adjunct'
import stringify from 'json-stringify-safe'
import { flatArrayify } from './utils/types'
import { isError, here, hereStr } from './utils/error'
import { pipeAsync, composeAsync, reflect } from './utils/fn'

import Just from './Just'
import Nothing from './Nothing'
import Ok from './Ok'
import Fault from './Fault'
import Passthrough from './Passthrough'

//*****************************************************************************
// Fonad type checkers
//*****************************************************************************

// a -> bool
export const isFm = $fm => isObject($fm) && propEq('_tag', '@@FMonad', $fm)
export const isNotFm = complement(isFm)

// 'type' -> fm -> bool
export const isType = curry((type, fm) => isFm(fm) && propEq('_type', type, fm))

// fm -> bool
export const isJust = isType('Just')
export const isNotJust = complement(isJust)

// fm -> bool
export const isFault = isType('Fault')
export const isNotFault = complement(isFault)

// fm -> bool
export const isNothing = isType('Nothing')
export const isNotNothing = complement(isNothing)

// fm -> bool
export const isOk = isType('Ok')
export const isNotOk = complement(isOk)

// fm -> bool
export const isPassthrough = isType('Passthrough')
export const isNotPassthrough = complement(isPassthrough)

// fm -> bool
export const isValue = fm => isJust(fm) || isFault(fm) || isNothing(fm)
export const isNotValue = complement(isValue)

// fm -> bool
export const isStatus = fm => isOk(fm) || isFault(fm)
export const isNotStatus = complement(isStatus)

// fm -> bool
// returns true if isFm(fm) && isNotJust(fm), otherwise returns false
export const isNonJustFm = fm => isFm(fm) && isNotJust(fm)

//*****************************************************************************
// Core Monadic Interface
//*****************************************************************************

// chain
//   Can accept either a monad, or a raw value to be chained thorugh `fn`
//   If isFm($fm) where $fm(v), returns result of calling fn(v)
//   If isNotFm($fm), returns result of calling fn($fm)
//   If an exception is thrown as a result of calling fn, a Fault is returned
//   (a->b) -> J[a] | a -> b | F
export const chain = curry(($fn, $fm) => {
  const op = 'chain()'
  const fn = extract($fn)
  try {
    return isFm($fm) ? $fm._chain(fn) : fn($fm)
  } catch (e) {
    return Fault({op, msg: 'Exception thrown by chain function', e})
  }
})

// map
//   Can accept either a monad, or a raw value to be mapped thorugh `fn`
//   If isFm($fm) where $fm(v), returns Just(fn(v))
//   If isNotFm($fm), returns Just(fn($fm))
//   If an exception is thrown as a result of calling fn, a Fault is returned
//   (a->b) -> J[a] | a -> J[b] | F
export const map = curry(($fn, $fm) => {
  const op = 'map()'
  const fn = extract($fn)
  try {
    return isFm($fm) ? $fm._map(fn) : Just(fn($fm))
  } catch (e) {
    return Fault({op, msg: 'Exception thrown by map function', e})
  }
})

// TODO: doc & test
export const mapTo = curry(($fn, fmMapToHere, $fm) => {
  const fn = extract($fn)
  const res = fn(extract($fm))
  convertToJust(res, fmMapToHere)
  return $fm
})

// extract
//   Extract the value being held/reprsented by a monad
//   extract(J(v)) -> v
//   extract(Nothing) -> null
//   extract(Ok) -> true
//   extract(Fault) -> false
//   extract(Passthrough(fmToPassthrough:)) -> fmToPassthrough:
//   extract(v) -> v
export const extract = $fm => {
  if (isJust($fm)) return $fm._val
  if (isNothing($fm)) return null
  if (isOk($fm)) return true
  if (isFault($fm)) return false
  if (isPassthrough($fm)) return $fm._fmToPassthrough
  return $fm
}

export const x = extract

// return a status message
export const statusMsg = fm =>
  (isFm(fm) ? fm._statusMsg() : `WARNING: can't get status for non-fm: ${stringify(fm)}`)

// return a resonable string representation of a monad
export const inspect = fm =>
  (isFm(fm) ? fm._inspect() : `WARNING: cant inspect non-monad: ${fm}`)

// Add note to FM
export const addNote = curry(($note, $fm) => {
  const fm = isFm($fm) ? $fm : Just($fm)
  fm._appendNote(extract($note))
  return fm
})

// TODO: doc & test
export const addNoteIf = curry(($condOrPred, $note, $fm) =>
  (_check($condOrPred, $fm) ? addNote(extract($note), $fm) : $fm))

// TODO: doc & test
export const addTaggedNote = curry(($note, $here, $fm) =>
  addNote(`${$note}${hereStr(extract($here))}`, $fm))

// addTaggedNoteIf
// TODO: doc
export const addTaggedNoteIf = curry(($condOrPred, $note, $here, $fm) =>
  _check($condOrPred, $fm) ? addNote(`${extract($note)}${hereStr(extract($here))}`, $fm) : Just($fm),
)

// TODO: doc & test
export const addClientErrMsg = curry(($msg, $fm) => {
  if (isFault($fm)) $fm._clientMsg = extract($msg)
  return $fm
})

// TODO: doc & test
export const addClientErrMsgIf = curry(($condOrPred, $msg, $fm) =>
  (_check($condOrPred, $fm) ? addClientErrMsg($msg, $fm) : $fm))

// TODO: doc & test
// refectlivy add error message to Fault
export const addErrCode = curry(($code, $fm) => {
  if (isFault($fm)) $fm._code = extract($code)
  return $fm
})

export const addErrCodeIf = curry(($condOrPred, $code, $fm) =>
  (_check($condOrPred, $fm) ? addErrCode($code, $fm) : $fm))

//*****************************************************************************
// Extended Monadic Interface
//*****************************************************************************

// mapAsync (NJR)
//   map an async function over a fonad, returning the result in a promise
//   If asycnFn rejects of throws an exception, a representative Fault is returned
//   if isFm(a) and isNotJust(a), reflects fm
//   async(a->b) -> Just(a) | a -> P(Just(b)| Fault)
export const mapAsync = curry(async ($asycnFn, $fm) => {
  if (isNonJustFm($fm)) return $fm
  const op = 'mapAsync()'
  const asycnFn = extract($asycnFn)
  try {
    return Just(await asycnFn(extract($fm)))
  } catch (e) {
    return Fault({op, msg: 'Exception thrown by async fn', e})
  }
})

// mapMethod (NJR)
//   map over a class method for cases when a, of Just(a) is an instantiateClassd class
//   if isJust($fm), for fm[a] calls a.method() and returns the result b in J[b]
//   if isNotFm(fm), calls fm.method() and and returns the result b in J[b]
//   If an exception is thrown as a result of a.method(), a Fault is returned
//   if isFm(a) and isNotJust(a), reflects fm
//   'fn-name' -> [ arg1, arg2, ...] | singleArg -> J[a] | a -> J[b] | F
export const mapMethod = curry(($method, $args, $fm) => {
  const op = 'mapMethod()'
  const args = _extractList($args)
  const method = extract($method)
  const { shouldReturn, toReturn } = _checkMapMethodArgs(op, method, args, $fm)
  if (shouldReturn) return toReturn
  const o = extract($fm)
  try {
    return Just(o[method](...flatArrayify(args)))
  } catch (e) {
    return Fault(op, `Exception thrown by map method '${method}'`, e)
  }
})

// mapAsyncMethod (NJR)
//   map an an asycn class method over a fonad, returning the result in a promise
//   if isJust($fm), for fm[a] calls a.method() and returns a promisified Just(result)
//   if isNotFm(fm), calls fm.method() and and returns a promisified Just(result)
//   If `method` rejects of throws an exception, a representative Fault is returned
//   'fn-name' -> [ arg1, arg2, ...] | singleArg -> J[a] | a -> P(J[b] | F)
export const mapAsyncMethod = curry(async ($method, $args, $fm) => {
  const op = 'mapAsyncMethod()'
  const args = _extractList($args)
  const method = extract($method)
  const { shouldReturn, toReturn } = _checkMapMethodArgs(op, method, args, $fm)
  if (shouldReturn) return toReturn
  const o = extract($fm)
  try {
    return Just(await o[method](...flatArrayify(args)))
  } catch (e) {
    return Fault({op, msg: `Exception thrown by async map method '${method}'`, e})
  }
})

// TODO: test list of calls
// call (NRJ, FOP)
//   Similar to map, but acting as a fault or passthrough conduit
//   If isFm($fm) where $fm(v), calls fn(v), return $fm on success
//   If isNotFm($fm), calls fn($fm), return Just($fm) on success
//   If fn() returns a F or thorw and exception, a Fault is returned
//   () | [ () ]-> J[a] | a -> $fm | F
export const call = curry(($fnOrFnList, $fm) => {
  if (isNonJustFm($fm)) return $fm
  return _call($fnOrFnList, $fm)
})

export const callOnFault = curry(($fnOrFnList, fault) => {
  if (isNotFault(fault)) return fault
  return _call($fnOrFnList, fault)
})

// type checking free
export const _call = curry(($fnOrFnList, $fm) => {
  if (isArray($fnOrFnList)) {
    const fnList = _extractList($fnOrFnList)
    fnList.forEach( fn => _call(fn, $fm))
    return $fm
  }
  const op = 'call()'
  const fn = extract($fnOrFnList)
  try {
    const res = fn(isJust($fm) ? extract($fm) : $fm)
    return isFault(res) ? res : Just($fm)
  } catch (e) {
    return Fault({op, msg: 'Exception thrown by function', e})
  }
})


// callAsycn (NRJ, FOP)
//   Similar to mapAsync, but acting as a fault or passthrough conduit
//   If isFm($fm) where $fm(v), calls fn(v), return P($fm) on success
//   If isNotFm($fm), calls fn($fm), return P(Just($fm)) on success
//   If fn() returns a F or thorw and exception, a P(Fault) is returned
//   async () -> J[a] | a -> P($fm | F)
export const callAsync = curry(async ($asycnFn, $fm) => {
  if (isNonJustFm($fm)) return $fm
  const op = 'callAsync()'
  const asycnFn = extract($asycnFn)
  try {
    const res = await asycnFn(extract($fm))
    return isFault(res) ? res : Just($fm)
  } catch (e) {
    return Fault(op, 'Exception thrown by async fn', e)
  }
})

// callMethod (FOP, NJR)
//   Similar to mapMethod, but acting as a fault or passthrough conduit
//   if isJust($fm), for $fm[a] calls a.method() and returns $fm on non Fault
//   if isNotFm($m), calls $fm.method() and and returns Just($fm)
//   If an exception thrown pr Fault returned upon callijng a.method(), a Fault is returned
//   'fn-name' -> [ arg1, arg2, ...] | singleArg -> J[a] | a -> $fm | F
export const callMethod = curry(($method, $args, $fm) => {
  const op = 'callMethod()'
  const args = _extractList($args)
  const method = extract($method)
  const { shouldReturn, toReturn } = _checkMapMethodArgs(op, method, args, $fm)
  if (shouldReturn) return toReturn
  const o = extract($fm)
  try {
    const res = o[method](...flatArrayify(args))
    return isFault(res) ? res : Just($fm)
  } catch (e) {
    return Fault({op, msg: `Exception thrown by method '${method}'`, e})
  }
})

// callMethodIf (FOP | NJR)
//   TODO: doc & test
//  ifIsFunc(condOrPred) calls method if condOrPred($fm) is true
//  ifIsNotFunc(condnOrPred) calls method if condnOrPred itself is true
export const callMethodIf = curry(($condOrPred, $method, $args, $fm) => {
  if (isNonJustFm($fm)) return $fm
  if (_check($condOrPred, $fm)) return callMethod($method, $args, $fm)
  return Just($fm)
})

// callAsyncMethod (FOP, NJR)
//   Similar to mapAsycnMethod, but acting as a fault or passthrough conduit
//   if isJust($fm), for fm[a] calls a.method() and returns Promise($fm) on non fault
//   if isNotFm(fm), calls fm.method() and and returns Promise(Just($fm))
//   If `method` rejects, throws an exception or returns a Fault, a representative Fault is returned
//   'fn-name' -> [ arg1, arg2, ...] | singleArg -> J[a] | a -> P($fm | F)
export const callAsyncMethod = curry(async ($method, $args, $fm) => {
  const op = 'callAsyncMethod()'
  const args = _extractList($args)
  const method = extract($method)
  const { shouldReturn, toReturn } = _checkMapMethodArgs(op, method, args, $fm)
  if (shouldReturn) return toReturn
  const o = extract($fm)
  try {
    const res = await o[method](...flatArrayify(args))
    return isFault(res) ? res : Just($fm)
  } catch (e) {
    return Fault(op, `Exception thrown by async method '${method}'`, e)
  }
})

// instantiateClass
//   TODO: write tests
//   Given a class and a single constructor arg, or an array of multiple
//   constructor args, return corresponding instantiateClassd class wrapped in Just
//   If an exception is thrown by the constructor, F is returned
//   className is used for error logging only
//   'className' -> Class -> arg | [args] -> J({instanitaed-class}) | F
export const instantiateClass = curry(($className, $Class, $args) => {
  if (isNonJustFm($args)) return $args
  const op = 'instantiating class'
  const args = _extractList($args)
  const className = extract($className)
  const Class = extract($Class)
  try {
    return Just(new Class(...args))
  } catch (e) {
    return Fault({op, msg: `Exception thrown during constrcution of class ${className}`, e})
  }
})

// Returns { shouldReturn: bool, toReturn: a }
// Note that op/method/args are raw (i.e. not monadic)
const _checkMapMethodArgs = (op, method, args, $fm) => {
  const r = (shouldReturn, toReturn) => ({ shouldReturn, toReturn })
  if (isNonJustFm($fm)) return r(true, $fm)
  const o = extract($fm)
  if (isNotObject(o)) return r(true, Fault({op, msg: `Non object supplied: ${$fm}`}))
  if (isNotFunction(o[method])) return r(true, Fault({op, msg: `Method '${method}' does not exist on object: ${stringify(o)}`}))
  return r(false, 'args are good')
}

const _check = ($condOrPred, fm) => {
  const condOrPred = extract($condOrPred)
  return isFunction(condOrPred) ? condOrPred(fm) : !!condOrPred
}

const _extractList = $list => flatArrayify(extract($list)).map($v => extract($v))

//*****************************************************************************
// Flow control functions
//*****************************************************************************

// caseOf
//   TODO: better docs
//   TODO: write tests
//   A switch like construct for evaluting conditions against v of fm(v) and carrying out
//   a specified action upon the first condition that evalutes as true
//   predActionList: [ [p1,f1a,f1b,...], [p2,f2a,f2b,...], ... ]
//   * predActions[0] = predicate.  Will be mapped over fm as fm -> bool.  Example predicates: isJust, isOk, isFault, isNil, etc.
//   * predActions[1..n] = list of fxns to pipe together, with fm as input, if predActions[0] evalues to true,
//     i.e. pipe(predActions[1], predActions[2], ...)(fm)
// For the first predicate that evalutes to true, predActions[1..n] are piped together and the raw result is returned
// You should always use orElse as a predicate for the last entry in the list to define default behaviour
// If none of the predicates evalute to true, an exception is thrown (which should not happen if elseIf is included)
// [ [p1,f1,...], [p2,f2...], ... ] -> fm -> F | a
export const caseOf = (predActionList, $fm) => {
  predActionList.forEach(predActions => {
    const pred = predActions[0]
    const actionList = drop(1, predActions)
    if (pred($fm)) {
      return pipe(...actionList)($fm)
    }
  })
  throw new Error(`caseOf() did not find match for fonad: ${stringify($fm)}`)
}

// Use with CaseOf as a fallback predicate action
export const orElse = () => true

export const passthroughIf = curry((condOrPred, $fm) => (_check(condOrPred, $fm) ? Passthrough($fm) : Just($fm)))

//*****************************************************************************
// Operate on monadic data
//*****************************************************************************

export const feq = curry(($val, $fm) => extract($val) === extract($fm))

//*****************************************************************************
// Logging
//*****************************************************************************

export const fstr = $fm => stringify(extract($fm))
export const fstrPretty = $fm => stringify(extract($fm), null, 2)

// logMsg (PT)
//   Log a message, passing through $fm
//   'msg' -> fm -> fm
export const logMsg = curry(($msg, fm) => {
  console.log(extract($msg))
  return fm
})

export const logMsgIf = curry(($condOrPred, $msg, $fm) => (_check($condOrPred, $fm) ? logMsg(extract($msg), $fm) : $fm))

// log (PT)
//   Log and return fmOrVal.
//   if isFm(fmOrVal) logs fmOrVal._inspect
//   fm -> fm
export const log = fmOrVal => {
  if (isFm(fmOrVal)) console.log(inspect(fmOrVal))
  else console.log('Non FM:', fmOrVal)
  return fmOrVal
}

export const logIf = curry(($condOrPred, $fm) => {
  _check($condOrPred, $fm) && log($fm)
  return $fm
})

// logRaw (PT)
//   Log and return val.
// if isFm(val), does a straight console.log (instead of inspect)
//   val -> val
export const logRaw = val => {
  console.log(val)
  return val
}

// logWithMsg (PT)
//   log given message and fmOrVal, and return fmOrVal
//    'msg' -> fmOrVal -> fmOrVal
export const logWithMsg = curry(($msg, fmOrVal) => {
  console.log(extract($msg))
  return log(fmOrVal)
})

// reflectivly log an S's status msg
export const logStatus = fm => {
  console.log(statusMsg(fm))
  return fm
}

//*****************************************************************************
// Monadic helpers
//*****************************************************************************

export const monadify = a => (isFm(a) ? a : isNil(a) ? Nothing() : isError(a) ? Fault({ e:a }) : Just(a))

// propagate (NJR)
//   TODO: docs
//   TODO: test
//   if isJust(fm) | isNotFm(fm), returns toPropagate
//   this allows a new value to be inserted in to the pipeline on non error states

export const propagate = curry(($toPropagate, fm) => (isJust(fm) || isNotFm(fm) ? Just($toPropagate) : fm))
export const switchTo = propagate

// if isFm(fm), convert it to a Just with the given vaue
// This does not generate a new fm, it converts the existing fm
export const convertToJust = curry((valForJust, fmToConvert) => {
  if (isNotFm(fmToConvert)) return fmToConvert
  const tempJust = Just(valForJust)
  // TODO: for the sake of staying functional, could use pipe instead of chaining
  keys(fmToConvert)
    .filter(k => k !== '_this' && k !== '_notes')
    .forEach(k => delete fmToConvert[k])
  keys(tempJust)
    .filter(k => k !== '_this' && k !== '_notes')
    .forEach(k => (fmToConvert[k] = tempJust[k]))
  return fmToConvert
})

export const capture = curry((captureHere, $fm) => {
  convertToJust(extract($fm), captureHere)
  return $fm
})

export const getNotes = fm => (isFm(fm) ? fm._notes : [])


export const done = $fm => (isPassthrough($fm) ? $fm._fmToPassthrough : $fm)


// TODO: TODO: TODO: really really really important to test this thouroughly
// making passthroughs a bit easier
// TODO: figure out how to make this work by adding done to fn list and calling pipeAsync
// always calls done at the end of a pipeline
// export const pipeAsyncFm = (...funcs) => x => pipeAsync([...funcs])(x)
export const applyAsync = (acc,val) => acc.then(val);
export const pipeAsyncFm = (...funcs) => x => [...funcs, done].reduce(applyAsync, Promise.resolve(x));



export { Just, Nothing, Ok, Fault, Passthrough }
export { pipeAsync, composeAsync, reflect, here }

// TODO
// * When faults generated w/in fonad utils, report module/line of caller (require allow here() to be bassed in)
// * allow loggers to be passed in for logging?

// import * as R from 'ramda';
// import * as RA from 'ramda-adjunct';
// import { logger, throwIf, terminate } from '../error/error';
// import { hasKeys } from '../../utils/fp';
// import LG from 'ramda-lens-groups';

import { curry, propEq, complement, isNil, drop, pipe, keys } from 'ramda'
import { mergeLeft as R_mergeLeft } from 'ramda'
import { isObject, isFunction, isNotFunction, isString, isNotObject } from 'ramda-adjunct'
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
export const chain = curry((fn, $fm) => {
  const op = 'chain()'
  try {
    return isFm($fm) ? $fm._chain(fn) : fn($fm)
  } catch (e) {
    return Fault(op, 'Exception thrown by chain function', e)
  }
})

// map
//   Can accept either a monad, or a raw value to be mapped thorugh `fn`
//   If isFm($fm) where $fm(v), returns Just(fn(v))
//   If isNotFm($fm), returns Just(fn($fm))
//   If an exception is thrown as a result of calling fn, a Fault is returned
//   (a->b) -> J[a] | a -> J[b] | F
export const map = curry((fn, $fm) => {
  const op = 'map()'
  try {
    return isFm($fm) ? $fm._map(fn) : Just(fn($fm))
  } catch (e) {
    return Fault(op, 'Exception thrown by map function', e)
  }
})

// TODO: test.  better docs
// TODO: perhaps deprecate this in favor of map with curried functions
// mapWithArgs
//   Similar to map, but for functions that require multiple args
//   For Just(a) will call fn(...preceedingArgs, a)
//   If an exception is thrown as a result of calling fn, a Fault is returned
//   (( x | [x1, x2, ...],a)->b) -> J[a] | a -> J[b] | F
export const mapWithArgs = curry((fn, preceedingArgs, $fm) => {
  if (isNonJustFm($fm)) return $fm
  const op = 'mapWithArgs()'
  try {
    const val = isJust($fm) ? $fm._val : $fm
    return Just(fn(...flatArrayify(preceedingArgs), val))
  } catch (e) {
    return Fault(op, `Exception thrown by mapWithArgs function, args supplied: ${stringify(preceedingArgs)} `, e)
  }
})

export const mapTo = curry((fn, mapToHere, $fm) => {
  const res = fn(extract($fm))
  convertToJust(res, mapToHere)
  return $fm
})

// extract
//   Extract the value being held/reprsented by a monad
//   extract(J(v)) -> v
//   extract(Nothing) -> null
//   extract(Ok) -> true
//   extract(Fault) -> false
//   extract(v) -> v
export const extract = $fm => {
  if (isJust($fm)) return $fm._val
  if (isNothing($fm)) return null
  if (isOk($fm)) return true
  if (isFault($fm)) return false
  return $fm
}

export const x = extract

// return a status message
export const statusMsg = fm => (isFm(fm) ? fm._statusMsg() : `WARNING: can't get status for non-fm: ${stringify(fm)}`)

// return a resonable string representation of a monad
export const inspect = fm => (isFm(fm) ? fm._inspect() : `WARNING: cant inspect non-monad: ${fm}`)

// Add note to FM
export const addNote = curry((note, $fm) => {
  const fm = isFm($fm) ? $fm : Just($fm)
  fm._appendNote(note)
  return fm
})

//*****************************************************************************
// Extended Monadic Interface
//*****************************************************************************

// mapAsync (NJR)
//   map an async function over a fonad, returning the result in a promise
//   If asycnFn rejects of throws an exception, a representative Fault is returned
//   if isFm(a) and isNotJust(a), reflects fm
//   async(a->b) -> Just(a) | a -> P(Just(b)| Fault)
export const mapAsync = curry(async (asycnFn, $fm) => {
  const op = 'mapAsync()'
  if (isNonJustFm($fm)) return $fm
  try {
    return Just(await asycnFn(extract($fm)))
  } catch (e) {
    return Fault(op, 'Exception thrown by async fn', e)
  }
})

// mapMethod (NJR)
//   map over a class method for cases when a, of Just(a) is an instantiateClassd class
//   if isJust($fm), for fm[a] calls a.method() and returns the result b in J[b]
//   if isNotFm(fm), calls fm.method() and and returns the result b in J[b]
//   If an exception is thrown as a result of a.method(), a Fault is returned
//   if isFm(a) and isNotJust(a), reflects fm
//   'fn-name' -> [ arg1, arg2, ...] | singleArg -> J[a] | a -> J[b] | F
export const mapMethod = curry((method, args, $fm) => {
  const op = 'mapMethod()'
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
export const mapAsyncMethod = curry(async (method, args, $fm) => {
  const op = 'mapAsyncMethod()'
  const { shouldReturn, toReturn } = _checkMapMethodArgs(op, method, args, $fm)
  if (shouldReturn) return toReturn
  const o = extract($fm)
  try {
    return Just(await o[method](...flatArrayify(args)))
  } catch (e) {
    return Fault(op, `Exception thrown by async map method '${method}'`, e)
  }
})

// call (NRJ, FOP)
//   Similar to map, but acting as a fault or passthrough conduit
//   If isFm($fm) where $fm(v), calls fn(v), return $fm on success
//   If isNotFm($fm), calls fn($fm), return Just($fm) on success
//   If fn() returns a F or thorw and exception, a Fault is returned
//   () -> J[a] | a -> $fm | F
export const call = curry((fn, $fm) => {
  const op = 'call()'
  if (isNonJustFm($fm)) return $fm
  try {
    const res = fn(extract($fm))
    return isFault(res) ? res : Just($fm)
  } catch (e) {
    return Fault(op, 'Exception thrown by function', e)
  }
})

// callAsycn (NRJ, FOP)
//   Similar to mapAsync, but acting as a fault or passthrough conduit
//   If isFm($fm) where $fm(v), calls fn(v), return P($fm) on success
//   If isNotFm($fm), calls fn($fm), return P(Just($fm)) on success
//   If fn() returns a F or thorw and exception, a P(Fault) is returned
//   async () -> J[a] | a -> P($fm | F)
export const callAsync = curry(async (asycnFn, $fm) => {
  const op = 'callAsync()'
  if (isNonJustFm($fm)) return $fm
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
export const callMethod = curry((method, args, $fm) => {
  const op = 'callMethod()'
  const { shouldReturn, toReturn } = _checkMapMethodArgs(op, method, args, $fm)
  if (shouldReturn) return toReturn
  const o = extract($fm)
  try {
    const res = o[method](...flatArrayify(args))
    return isFault(res) ? res : Just($fm)
  } catch (e) {
    return Fault(op, `Exception thrown by method '${method}'`, e)
  }
})

// callMethodIf (FOP | NJR)
//   TODO: better docs, test
//  ifIsFunc(condOrPred) calls method if condOrPred($fm) is true
//  ifIsNotFunc(condnOrPred) calls method if condnOrPred itself is true
export const callMethodIf = curry((condOrPred, method, args, $fm) => {
  if (isNonJustFm($fm)) return $fm
  if (_condOrPred(condOrPred, $fm)) return callMethod(method, args, $fm)
  return Just($fm)
})

// callAsyncMethod (FOP, NJR)
//   Similar to mapAsycnMethod, but acting as a fault or passthrough conduit
//   if isJust($fm), for fm[a] calls a.method() and returns Promise($fm) on non fault
//   if isNotFm(fm), calls fm.method() and and returns Promise(Just($fm))
//   If `method` rejects, throws an exception or returns a Fault, a representative Fault is returned
//   'fn-name' -> [ arg1, arg2, ...] | singleArg -> J[a] | a -> P($fm | F)
export const callAsyncMethod = curry(async (method, args, $fm) => {
  const op = 'callAsyncMethod()'
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
export const instantiateClass = curry((className, Class, args) => {
  const op = 'instantiating class'
  try {
    return Just(new Class(...flatArrayify(args)))
  } catch (e) {
    return Fault(op, `Exception thrown during constrcution of class ${className}`, e)
  }
})

// addTaggedNote
//   TODO: better docs
export const addTaggedNote = curry((note, here, $fm) => addNote(`${note}${hereStr(here)}`, $fm))

// addTaggedNoteIf
//   TODO: better docs
export const addTaggedNoteIf = curry((condOrPred, note, here, $fm) =>
  _condOrPred(condOrPred, $fm) ? addNote(`${note}${hereStr(here)}`, $fm) : Just($fm),
)

export const addNoteIf = curry((condOrPred, note, $fm) => (_condOrPred(condOrPred, $fm) ? addNote(note, $fm) : Just($fm)))

// Returns { shouldReturn: bool, toReturn: a }
const _checkMapMethodArgs = (op, method, args, $fm) => {
  const r = (shouldReturn, toReturn) => ({ shouldReturn, toReturn })
  if (isNonJustFm($fm)) return r(true, $fm)
  const o = extract($fm)
  if (isNotObject(o)) return r(true, Fault(op, `Non object supplied: ${$fm}`))
  if (isNotFunction(o[method])) return r(true, Fault(op, `Method '${method}' does not exist on object: ${stringify(o)}`))
  return r(false, 'args are good')
}

const _condOrPred = (condOrPred, fm) => {
  // console.log('condOrPred: ', condOrPred)
  // console.log('isFunction(condOrPred): ', isFunction(condOrPred))
  // console.log(fm)
  return isFunction(condOrPred) ? condOrPred(fm) : !!condOrPred
}

//*****************************************************************************
// Flow control functions
//*****************************************************************************

// caseOf
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
const caseOf = (predActionList, $fm) => {
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

export const returnIf = curry((condOrPred, fm) => (_condOrPred(condOrPred, fm) ? Passthrough(fm) : Just(fm)))

export const done = fm => isPassthrough(fm) ? fm._fmToWPassthrough : fm

// export const addNoteIf = curry((condOrPred, note, $fm) => (_condOrPred(condOrPred, $fm) ? addNote(note, $fm) : Just($fm)))

// call
//   call a function recieving a single $fm argument (typically curried)
//
//   call

// // TODO: Obsolute
// // TODO: convert this to using `pt` fn ??
// // map method, and if succeful pass through maybeMF
// // TODO: better docs needed
// export const mapMethodPT = curry((method, args, $fm) => {
//   const result = mapMethod(method, args, $fm)
//   return isFault(result) ? result : $fm
// })

// // TODO: change to callMethodIf
// export const mapMethodIfConditionPT = curry((condition, method, args, $fm) => (condition ? mapMethodPT(method, args, $fm) : $fm))

// // TODO: obsolete
// // for any fn that takes an single arg $fm and that returns an FM, call that fn supplying $fm.  If that
// // fn returns a fault, returns the fault, otherwise reflects $fm
// // () => [] => $fm
// // TODO: make parallael pt that is not asynch ... rename pta ?
// export const ptAsycn = curry(async (fn, $fm) => {
//   const res = await fn($fm)
//   return isFault(res) ? res : Just($fm)
// })

//*****************************************************************************
// Manipulation of Just wrapped data
//*****************************************************************************

// TODO: docs, tests
// TODO: probably depracate in favor of mapWithArgs + ramda.mergeLeft
export const mergeLeft = curry((mergeTarget, $fm) => {
  if (isNonJustFm($fm)) return $fm
  return Just(R_mergeLeft(mergeTarget, extract($fm)))
})

//*****************************************************************************
// Logging
//*****************************************************************************

// logMsg (PT)
//   Log a message, passing through $fm
//   'msg' -> fm -> fm
export const logMsg = curry((msg, fm) => {
  console.log(msg)
  return fm
})

export const logMsgIf = curry((condOrPred, msg, $fm) => (_condOrPred(condOrPred, $fm) ? logMsg(msg, $fm) : $fm))

// log (PT)
//   Log and return fmOrVal.
//   if isFm(fmOrVal) logs fmOrVal._inspect
//   fm -> fm
export const log = fmOrVal => {
  if (isFm(fmOrVal)) console.log(inspect(fmOrVal))
  else console.log('Non FM:', fmOrVal)
  return fmOrVal
}

export const logIf = curry((condOrPred, $fm) => {
  _condOrPred(condOrPred, $fm) && log($fm)
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
export const logWithMsg = curry((msg, fmOrVal) => {
  console.log(msg)
  return log(fmOrVal)
})

// reflectivly log an S's status msg
export const logStatus = fm => {
  console.log(statusMsg(fm))
  return fm
}

// --- the line ------------------------------------

// export const logMsgOnNonFault = curry((msg, fmOrVal) => {
//   if (isNotFault(fmOrVal)) console.log(msg)
//   return fmOrVal
// })

// export const logFmWithMsg = curry((msg, fm) => {
//   console.log(msg)
//   return logFm(fm)
// })

// export const logValWithMsg = curry((msg, val, fm) => {
//   console.log(msg)
//   console.log(val)
//   return fm
// })

//*****************************************************************************
// Monadic helpers
//*****************************************************************************

export const monadify = a => (isFm(a) ? a : isNil(a) ? Nothing() : isError(a) ? Fault('', '', a) : Just(a))

// propagate (NJR)
//   TODO: docs
//   TODO: test
//   if isJust(fm) | isNotFm(fm), returns toPropagate
//   this allows a new value to be inserted in to the pipeline on non error states

export const propagate = curry(($toPropagate, fm) => (isJust(fm) || isNotFm(fm) ? Just($toPropagate) : fm))
export const switchTo = propagate

//--- the line -----------------------------------------------------------------

export const ifNotFault = curry((action, fm) => {
  if (isNotFault(fm)) action(fm)
  return fm
})

// export const propagateOnJust = curry((val, fm) => (isNonJustFm(fm) ? fm : val))
// export const switchToOnJust = propagateOnJust
// export const switchTo = curry((val, _) => val)

export const switchToOnNonFault = curry((val, fm) => (isFault(fm) ? fm : val))

// Add note to FM
// export const addNote = curry((note, fm) => {
//   isFm(fm) && fm._appendNote(note)
//   return fm
// })

export const getNotes = fm => (isFm(fm) ? fm._notes : [])

// export const addNoteFrom = curry((here, note, fm) => {
//   fm._appendNote(`${note}${hereStr(here)}`)
//   return fm
// })

// // Add note to Fault
// export const addNoteIfFault = curry((note, here, fm) =>
//   isFault(fm) ? addNote(note, here, fm) : fm,
// )

// // Set Fault root cause
// export const setRootCauseIfFault = curry((rootCause, here, fm) => {
//   if (!isFault(fm) || !isString(rootCause)) return fm
//   // if a root cause has already been established, convert this to a note
//   if (fm._rootCause) {
//     addNote(rootCause, here, fm)
//   } else {
//     fm._setRootCause(`${rootCause}${hereStr(here)}`)
//   }
//   return fm
// })

// // Add note to FM, including contents of incoming monad
// export const addFmNote = curry((note, fm) => fm._appendNote(`${note} ${value(fm)}`))

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

// given an fm, return corresponding status FM | NMR
// Assume only Value and Ok are OK, otherwise fault (TODO: more docs)
export const toStatus = fm => {
  if (isOk(fm) || isFault(fm)) return fm
  if (isValue(fm)) return Ok('', 'All seems well') // TODO, means by which to transfer notes
  if (isNothing(fm)) return Fault('', 'Nothing recieved, assuming error') // TODO, means by which to transfer notes
  return fm
}

export const capture = curry((captureHere, $fm) => {
  // isJust(fm) && convertToJust(fm._val, captureHere)
  convertToJust(extract($fm), captureHere)
  return $fm
})

// call fnToCall(fm)
// If fnToCall succeds, return fm
// If fnToCall fails

//export const inspect = fm => hasInspect(fm) ? fm._inspect() : `cant inspect non-monad: ${fm}`;
// // same as chain, excpet returns fallback if fm is not a Monad
// export const chainOr = R.curry((fn,fallback,fm) => hasChain(fm) ? fm._chain(fn) : fallback);

// // exract the a value that can be used for reporting, etc (value, error msg, etc)
// export const extract = R.curry(fm => hasExtract(fm) ? fm._extract() : undefined);

// // Fault as a fxn call (ignores input that triggers the call)
// export const FaultF = (operation = '', messages='', e=null ) =>
//   () => Fault(operation, messages, e);

// // reflectivly log status message

// // TODO: add something like bool : _appliesMap to FMs and use that instead of checking for type
// const appliesMap = fm => isJust(fm);
// const doesNotApplyMap = R.complement(appliesMap);

// // Use with CaseOf as a fallback predicate action
// export const orElse = () => true;

// //*****************************************************************************
// // Useful fxns
// //*****************************************************************************

// If fm[a] is Just, and and val === a return true, otherwise return false
// fm -> val -> bool
// export const isEq = (val,fm) => isJust(fm) && val === identity(fm)
// export const isNotEq = R.complement(isEq);

// // 'type' -> fm -> bool
// export const isType = R.curry((type, fm) => hasType(fm) ? fm._type === type : false);

// // fm -> bool
// export const isJust = isType('Just');
// export const isNotJust = R.complement(isJust);

// // fm -> bool
// export const isFault = isType('Fault');
// export const isNotFault = R.complement(isFault);

// // fm -> bool
// export const isNothing = isType('Nothing');
// export const isNotNothing = R.complement(isNothing);

// // fm -> bool
// export const isOk = isType('Ok');
// export const isNotOk = R.complement(isNothing);

// // If fm[a] is Just, and and val === a return true, otherwise return false
// // fm -> val -> bool
// export const isEq = (val,fm) => isJust(fm) && val === identity(fm)
// export const isNotEq = R.complement(isEq);

// export const isValue = fm => isJust(fm) || isFault(fm) || isNothing(fm);
// export const isNotValue = R.complement(isValue);

// export const isStatus = fm => isOk(fm) || isFault(fm);
// export const isNotStatus = R.complement(isStatus);

// // TODO: better to this thorugh duck typing so that you don't have to add here whenever new monad created ??
// export const isFm = $fm => R.prop("_tag",$fm) === '@@FMonad';

// export const isNotFm = R.complement(isFm);

// export const hasMsg = fm => isFault(fm) || isOk(fm);

// // TODO: instead use isJustAnd
// // If fm is Just, apply pred to the contained value and return result
// // if fm isNotJust, return false
// // export const check = (pred,fm) => isJust(fm) && pred(identity(fm));
// // export const checkNot = R.complement(isEq);

// // apply this convention to all fxns to conditionally carry out an action
// // doIf(pred,fm) if predicate is a monadic operator, and monad is returned
// // doIfCondition(pred, fm) for indpendent conditions
// // QUESTION: should I append an M to all fxns that return a monad?

// // if fm isJust[a] return result of applying pred to a
// // if fm isNotJust return false
// // export const ifJustAnd = (fm,pred) => isJust(fm) && pred(identity(fm));
// export const ifJustAnd = (pred, fm) => isJust(fm) && pred(identity(fm));
// export const ifNotJustOr = (pred, fm) => isNotJust(fm) || pred(identity(fm));

// export const ifJustAndNot = R.complement(ifJustAnd);

// // if fm isNotJust or Just(undefined|null), return true, otherwise return false
// export const isNil = fm => ifNotJustOr(R.isNil,fm);
// export const isNotNil = R.complement(isNil);

// // if pred(fm) call action returning it's result, other wise reflect fm
// // TODO:
// // - asycn vs sycn? Ability to handle list of actions.  Think about generit M.if (pred,action,fm)
// export const ifThen =
//   R.curry((pred, action ,fm) => pred(fm) ? action() : fm);

// export const ifThenElse =
//   R.curry((pred, trueAction, falseAction ,fm) =>  pred(fm) ? trueAction() : falseAction());

// export const ifIsFault = R.curry(() => null

// );

// // if isFault(fm) call action(arg) and return the results, otherwise reflect fm
// // TODO: currently only takes single arg need to convert args ArgList when it has been created
// // (arg -> a) -> arg -> a
// // export const ifFaultThen = R.curry((action, arg, fm) => M.isFault(fm) ? action(arg) : fm);

// // if fm is Just(undefined|nill) return true, otherwise return false
// export const isJustNil = R.curry(fm => ifJustAnd(R.isNil,fm));

// // return first argument passed
// export const reflect = a => a;
// export const reflectLast = (...args) => R.last(args); // returns last argument passed

// // if hasMsg(fm), prepend msg to i'ts message stack
// // export const reflectWithMessage = ( msg, fm ) =>

// // given any value a, call fn(a), and then return a
// // a can be any type of value, including an M
// export const reflectivlyApply = R.curry((fn, a) => { fn[a], a});

// // if pred(val), return Just[val], otherwise return Fault[operation, messages]
// // pred -> 'operation' -> 'errMsg' | ['errMsgs'] -> val -> Fault() | Just(val)
// export const faultIfOrJust = R.curry((pred, operation, messages, val ) =>
//   pred(val) ? Fault(operation, messages) : Just(val));

// // Fault or Passthorugh fxn
// // If condition evaulates to true, return Fault[op/messages], otherwise reflect passThrough
// // for proper pipelining.  If isFault(fm) and `condition`, the operation/messages will be appended
// // to the existing fault info, for fault stacking.
// // condition -> 'op', 'message' | ['messages'] -> Fault[errMsg] | lastArg
// export const faultIfCondition = R.curry((condition, operation, messages, passThrough) =>
//   condition ? isFault(passThrough) ?
//     appendFaultEntry(operation, messages, null, passThrough) : Fault(operation, messages) : passThrough);

// // if hasNotes(fm) add a `note` and return fm, otherwise return fm unchanged
// // Currently only S monads (F/S) have notes
// export const addNote = R.curry((note, fm) =>
//   isStatus(fm) ? fm._appendNote(note) : fm);

// // applying the monadic applicative to fm results in true, return Fault[errMsg], otherwise return fm
// // if isFault(fm) and pred(fm), the returned F will inlucde fm's fault info in addition
// // the incoming `operation` and `messages`
// // (fm -> bool) -> 'operation', 'errMsg' -> fm | Fault[errMsg]
// export const faultIf = R.curry((pred, operation, messages, fm) => pred(fm) ?
//   isFault(fm) ? appendFaultEntry(operation, messages, null, fm) : Fault(operation, messages) : fm);

// // If condition evaulates to true, return Fault[errMsg], otherwise return fm
// // condition -> 'errMsg' -> fm | Fault[errMsg]
// // export const okIfCondition = R.curry((condition, operation, errMsg, fm) => condition ? Ok(operation, errMsg) : fm);

// // apply a list of predicates to fm, return true if any of them evaluation to true
// export const or = (predList, fm) => {
//   for (let i = 0; i < predList.legnth; i++ ) {
//     if ( predList[i](fm) ) return true;
//   }
//   return false;
// };

// // if isFault(fm), log fault message stack and terminate the app, otherwise reflect fm
// // fm -> fm
// export const terminateIfFault = fm => {
//   if (isFault(fm)) terminate(statusMsg(fm));
//   return fm;
// }

// const typeCheckPreds = {
//   'string' : RA.isNotString,
//   'plain object' : RA.isNotPlainObj,
//   'array' : RA.isNotArray,
// }

// // Fault or Passthrough fxn
// // Check type match for an `argType` (see typeCheckPreds keys) and an `arg`
// // If arg type matches, return passThrough otherwise return F which logs fnName, op, and arg info
// // 'fn-name' -> 'operation' -> a -> 'argName' -> 'argType' -> F | passThrough
// export const checkArg = R.curry((fnName, op, arg, argName, argType, passThrough) =>
//   isFault(passThrough) ? passThrough :
//   typeCheckPreds[argType] ?
//     faultIfCondition( typeCheckPreds[argType](arg), op,`${fnName}: non ${argType} supplied for arg ${argName}: '${arg}'`, passThrough) :
//     M.Fault(op, `checkArg(): function '${fnName}' supplied invalid arg type: '${argType}'`));

// // Note: maybe any "if" funciton takes a predicate to be applied to a monday
// // When the function requires an condition rather then ap reciatge, then "ifCondition"

// // Maps an empty isNotJust fm by calling fn with arg.
// // fn must return it's result in an fm.
// // If fm isJust, the supplied fm is returned.
// // fm1 -> (()->a) -> fm2[a] | fm1
// // export const mapIfEmpty = (fm,fn,arg) => isJust(fm) ? fm : fn(arg);

// // Prepend `msg` the the most recent fault's message stack
// // export const addToMostRecentFaultMsg = R.curry((msg,fm) => isFault(fm) ?

// //*****************************************************************************
// // Non standard API
// //*****************************************************************************

// // Given an fm, return it's contained value or message
// // fm[a] -> a
// export const identity = fm => chain(R.identity, fm);

// // TODO: evolve toward this
// // M.log:
// //   Assumes last arg is an FM, behaviour undefined otherwise
// //   Log all args, terminated by an FM.  Reflect FM
// // M.inspect
// //   log all args, if any of them hasInspect, log using inspect, assumes last if FM, reflect last

// // if isFault(fm), Return new FM, with error info appended to fm's fault msg list
// // if isNotFault(fm), reflect fm
// // 'op' -> 'message' | ['messageList'], Error -> fm -> fm
// const appendFaultEntry = (operation, messages, e, fm) =>
//   isFault(fm) ? fm._appendEntry(operation, messages,e) : fm;

// // if isOk(fm), Return new Ok, msg appended to it's status msg list
// // if isNotOk(fm), reflect fm
// // 'message' | ['messageList'] -> fm -> fm
// const appendOkMsg = R.curry((msg,fm) =>
//   isOk(fm) ? fm._appendStatusMsg(msg) : fm);

// // log and reflect val
// export const log = val => {
//   logger(isFm(val) ? inspect(val) : val);
//   return val;
// };

// // log 2 values, reflect last.
// // This is useful in pipelines for logging a messaage follwed by the value in the pipeline
// export const log2 = R.curry((val1, val2) => {
//   logger(
//     isFm(val1) ? inspect(val1) : val1, isFm(val2) ? inspect(val2) : val2);
//   return val2;
// });

// // reflectivly log an S's status msg
// const logStatus = fm => {
//   if (statusMsg(fm)) logger(statusMsg(fm));
//   return fm;
// }

// // log a message and status of fm, return fm
// const logMsgAndStatus = R.curry((msg,fm) => {
//   logger(msg);
//   if (statusMsg(fm)) logger(statusMsg(fm));
//   return fm;
// });

// // if isOk(fm) `msg` is logged.  returns fm
// // '' -> fm -> fm
// const logIfOk = R.curry((msg,fm) => {
//   if ( isOk(fm) ) logger(msg);
//   return fm;
// });

// // Reflectivly log the inspection of an val.
// // if val is an FM the inspection string is logged, otherwise it is logged raw
// export const logInspect = val => {
//   hasInspect(val) ? logger(inspect(val)) : console.log(val);
//   return val;
// }

// // Log the inspection of two values, reflect the second
// // for FM inputs the inspection string is logged, otherwise it will be logged raw
// // This is useful in pipelines for logging a messaage follwed by the inspection of value in the pipeline
// export const logInspect2 = R.curry((val1,val2) => {
//   logger(
//     hasInspect(val1) ? inspect(val1) : val1,
//     hasInspect(val2) ? inspect(val2) : val2
//   )
//   return val2;
// })

// // If isFault(fm), calls errPred with a list of the Fault's exceptions and the supplied
// // errName. Resuilt of that call is returned. tf isNotFault(fm), returns false
// // Caller is responsible for proper definitions of errPred/errName
// // ('errName' -> [e] -> bool), 'errName' -> bool
// export const isFaultAnd = R.curry((errPred, errName, fm) =>
//   isFault(fm) ? errPred(errName, fm._exceptionList()) : false);

// // if isJust(fm) and isJust(captureHere), for fm[v] insert v
// // into captureHere.  Returns fm
// // J[] -> fm[v] -> fm  (results in captureHere[v])
// export const capture = R.curry((captureHere, fm) => {
//   if (R.all(isJust,[captureHere, fm])) captureHere._val = fm._val;
//   return fm;
// });

// // if isJust(fm), then for fm[v], returns true if v.propName exists and
// // v.propName deep equals value otherwise returns false.
// export const propEq = R.curry((propName, value, fm) =>
//   isFault(fm) ? fm :
//   isJust(fm) ? R.propEq(propName, value, fm._val) : false);

// // if isJust(fm), then for fm[v], returns true if v.propName exists and
// // v.propName does not deep equals value otherwise returns false.
// export const propNotEq = R.curry((propName, value, fm) =>
//   R.not(R.propEq(propName, value, fm._val)));

// // if isJust(fm), then for fm[v], returns true if v.propName exists and
// // pred[v.propName] evaluates to true, otherwise returns false.

// export const propSatisfies = R.curry((propName, pred, fm) =>
//   isJust(fm) && R.has(propName,fm._val) && pred(R.prop(propName, fm._val)));

// export const propDoesNotSatisfy = R.curry((propName, pred, fm) =>
//   R.not(propSatisfies(propName, pred, fm)));

// // Simlar to Ramda prop.
// // if isJust(fm), for fm[v], if isObj[v] and v[propName] exists
// // returns Just(v[propName]) otherwise return undefined.
// // '' -> fm[v] -> Juar(v[propName]) | undefined
// export const prop = R.curry((propName, fm) => map(R.prop(propName),fm));

// // same as prop, except return unwrapped value
// export const propRaw = R.curry((propName, fm) =>
//   R.pipe(prop(propName), extract)(fm));

// // of isJust(fm), for fm[v], returns true if v is an array of lenght checkLength, otherwise returns false
// export const isArrayOfLength = R.curry((checkLength,fm) =>
//   isJust(fm) && RA.isArray(fm._val) && R.length(fm._val) === checkLength);

// // of isJust(fm), for fm[v], returns true if v is not an array of lenght checkLength, otherwise returns false
// export const isNotArrayOfLength = R.curry((checkLength,fm) =>
//   R.not(isArrayOfLength(checkLength,fm)));

// // if isJust(fm), for fm[v], if isArray(v), v[idx] exists, return J(v[idx]), otherwise returns N
// export const arrayEntry = R.curry((idx,fm) =>
//   isJust(fm) && RA.isArray(fm._val) && fm._val.length <= idx+1 ? Just(fm._val[idx]) : Nothing());

//   // If isJust(fm), for fm[v], returns true if v[propName] is an array
// // with length = checkLength, otherwise returns false
// export const propsIsArrayOfLength = R.curry((propName, checkLength, fm) => {
//   if ( isNotJust(fm) ) return false;
//   return R.pipe(
//     R.prop(propName),
//     RA.lengthEq(checkLength)
//   )(fm._val)
// });

// // If isJust(fm), for fm[v], returns true if v[propName] is not an array
// // or is an array with length != checkLength, otherwise returns false
// export const propIsNotArrayOfLength = R.curry((propName, checkLength, fm) =>
//   R.not(propsIsArrayOfLength(propName, checkLength, fm)));

// // if isJust(fm), for fm[v], if isObj(v), and v has all props in propNames,
// // return true, otherwise return false
// export const hasProps = R.curry((propNames,fm) =>
//   isJust(fm) && hasKeys(propNames, fm._val));

// // if isJust(fm), for fm[v], if isObj(v), and v does not have all props in propNames,
// // return true, otherwise return false
// export const doesNotHaveProps = R.curry((propNames,fm) =>
//   R.not(hasProps(propNames,fm)));

// // if pred(fm) call trueFn(fm), else call falseFn(fm), and return J(result) of the called function
// // (fm->bool) -> (fm->a) -> (fm->a), fm (fault reflective)
// export const ifElse = R.curry((pred, trueFn, falseFn, fm) =>
//   isFault(fm) ? fm :
//   pred(fm) ? Just(trueFn(fm)) : Just(falseFn(fm))
// );

// // if isFm(fm), return pretty json result of extract(fm)
// // if isNotFm(fm), string w error msg
// export const str = fm => isFm(fm) ?
//   JSON.stringify(extract(fm),null,2) : 'non fm supplied to M.str()';

// // reflectivly log a message within a pipeline
// export const announce = R.curry((msg,fm) => { logger(msg); return fm; });

// // convert an FM to an external promise
// // if isFault(fm) the promise is rejection
// //    if isNotNull(customError), the rejects with return value of customError(fm)
// //    otherwise rejects with the faults status message
// // if isJust(fm), then for fm[a], the promise is resolved with resolve(a)
// // if isOK(fm), then promise is resloved with the that Ok's status message
// // if isNothing(fm), the promised is rejected with a message indicating this
// // if isnotFm(fm), the promised is rejected with a message indicating this
// export const toExternalPromise = R.curry((customErrorFn, fm) => new Promise((resolve, reject) => {
//   if (isJust(fm))
//     resolve(extract(fm));
//   else if (isOk(fm))
//     resolve(statusMsg(fm));
//   else if (isFault(fm))
//     reject(RA.isNotNil(customErrorFn) ? customErrorFn(fm) : statusMsg(fm))
//   else if (isNothing(fm))
//     reject('toExternalPromise(): Nothing was provided');
//   else
//     reject('toExternalPromise(): non FM was provided');
// }));

// // Check for valid fm
// // if isJust(fm) returns true
// // if isOK(fm) returns true
// // if isFault(fm) returns false
// // if isNothing(fm) false
// // if isnotFm(fm) returns false
// export const isValid = fm => new Promise((resolve, reject) => {
//   if (isJust(fm)) return true;
//   if (isOk(fm)) return true;
//   return false;
// })

// const M = {
//   Just,
//   Fault,
//   Nothing,
//   Ok,
//   map, chain, chainOr, mapMethod, mapAsyncMethod, capture,
//   isJust, isNotJust, isOk, isNotOk, isFault, isNotFault, isNothing, isNotNothing,
//   isFm, isNotFm, isValue, isNotValue, isStatus, isNotStatus, isNil, isNotNil,
//   faultIfOrJust, ifJustAnd, ifJustAndNot, ifElse, orElse, faultIf, isJustNil, terminateIfFault,
//   faultIfCondition, caseOfLoose, caseOf, ifThen, ifThenElse, isFaultAnd,
//   identity, inspect, reflect, reflectLast, reflectivlyApply, statusMsg, addNote,
//   log, log2, logInspect, logInspect2, logStatus, logMsgAndStatus, logIfOk, announce, extract,
//   prop, propRaw, propEq, propNotEq, propSatisfies, propDoesNotSatisfy, checkArg,
//   propsIsArrayOfLength, propIsNotArrayOfLength, arrayEntry, hasProps, doesNotHaveProps,
//   or, toExternalPromise, isValid, str, isArrayOfLength, isNotArrayOfLength
//}
// export default M

export { Just, Nothing, Ok, Fault, Passthrough }
export { pipeAsync, composeAsync, reflect, here }

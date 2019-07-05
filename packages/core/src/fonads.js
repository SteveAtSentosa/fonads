// TODO:
// * Can I make map/mapasync, call/callasync, etc single function smart about type of incoming fn?
//   - This would really be nice
// * For Any function calling a supplied function (predCheck, callIf, caseOf, predlist, etc), handle async input fns
// * Let caseOf recieve predOrHard list
// * Move all monadic helper like fxns to monads themselves?
// * Add new notes/here stuff into viz

import { curry, prop, propEq, complement, includes, drop, pipe, pipeP, keys, all, any } from 'ramda'
import { isObject, isFunction, isNotFunction, isNotObject, isArray, isTruthy, isPromise } from 'ramda-adjunct'
// import stringify from 'json-stringify-safe'
import { flatArrayify, isEmptyOrNil } from './utils/types'
import { isError, here, throwIf } from './utils/error'
import { codeInfoOrStr, str, json } from './utils/string'
import { pipeAsync, composeAsync, reflect } from './utils/fn'

import Just from './Just'
import Nothing from './Nothing'
import Ok from './Ok'
import Fault from './Fault'
import Passthrough from './Passthrough'

//*****************************************************************************
// Fonad type checkers
//*****************************************************************************

// In general when checking for a positivy type match, the fm being checked
// will be returned on match (truthy), and false returned on no match

// if obj[propKey] === propVal then returns obj (truthy), otherwise boolean false
const _propEqReflect = curry((propKey, propVal, obj) =>
  isObject(obj) && propEq(propKey, propVal, obj) ? obj : false)

// a -> isFm ? fm (truthy) | false
// export const isFm = toCheck =>
//   isObject(toCheck) && propEq('_tag', '@@FMonad', toCheck) ? toCheck : false
export const isFm = _propEqReflect('_tag', '@@FMonad')
export const isNotFm = complement(isFm) // returns bool


// 'type' -> fm -> typeMatch ? toCheck (truthy) | false
export const isType = curry((type, toCheck) => _propEqReflect('_type', type, toCheck))
export const isNotType = complement(isType) // returns bool
//
// fm -> truthy | false
export const isJust = isType('Just') // returns the just on match, otherwise boolean false
export const isNotJust = complement(isJust) // returns bool

// fm -> truthy | false
export const isFault = isType('Fault') // returns the fault on match, otherwise boolean false
export const isNotFault = complement(isFault) // returns bool

// fm -> truthy | false
export const isNothing = isType('Nothing') // returns the nothing on match, otherwise boolean false
export const isNotNothing = complement(isNothing) // returns bool

// fm -> truthy | false
export const isOk = isType('Ok') // returns the ok on match, otherwise boolean false
export const isNotOk = complement(isOk) // returns bool

// fm -> truthy | false
export const isPassthrough = isType('Passthrough') // returns the passthrough on match, otherwise boolean false
export const isNotPassthrough = complement(isPassthrough) // returns bool

// fm -> truthy | false
export const isValue = fm => isJust(fm) || isFault(fm) || isNothing(fm) // returns the fm on match, otherwise boolean false
export const isNotValue = complement(isValue) // returns bool

// fm -> bool
export const isStatus = fm => isOk(fm) || isFault(fm) // returns the fm on match, otherwise boolean false
export const isNotStatus = complement(isStatus) // returns bool

// fm -> truthy | false
// returns fm on match, otherwise returns false
export const isNonJustFm = fm => isFm(fm) && isNotJust(fm) ? fm : false

// fm -> truthy | false
// returns fm on match, otherwise returns false
export const isEmptyOrNilJust = fm => isJust(fm) && isEmptyOrNil(fm._val) ? fm : false

//*****************************************************************************
// Core interface
//*****************************************************************************


// map [ sync | async, NJR ]
//   Return result of calling $fn($fm) wrapped in a Just
//   If an exception is thrown as a result of calling fn, a Fault is returned
//   if $fn is async, same behaviour, except enclosed in a promise
//   (a->b) -> J[a] | a -> J[b] | F | Promise(J[b] | F)
export const map = curry(($fn, $fm) => {
  if (isNonJustFm($fm)) return $fm
  const op = 'map()'
  const msg = 'Exception thrown by map function'
  const fn = extract($fn); const val = extract($fm)
  try {
    const $res = fn(val)
    const res = extract($res)
    return (
      isPromise(res) ? fPromisify(res, { op, msg }) :
      isPromise($res) ? fPromisify($res, { op, msg }) :
      fonadify($res))
  } catch (e) {
    return Fault({ op, msg, e })
  }
})

// const res = fn(val)
// if (isPromise(extract(res))) {
//   return fPromisifyReflect(res, $fm, { op, msg })
// }
// return isFault(res) ? res : $fm


// mapMethod [ sync | async, NJR ]
//   Map over a class method for cases when a, of Just(a) is an instantiateClassd class
//   if isJust($fm), for fm[a] calls a.method() and returns the result b in J[b]
//   if isNotFm(fm), calls fm.method() and and returns the result b in J[b]
//   If an exception is thrown as a result of a.method(), a Fault is returned
//   if isFm(a) and isNotJust(a), reflects fm
//   if a.method is async, returns as descrpbed above, wrapped in a promise
//   'fn-name' -> [ arg1, arg2, ...] | singleArg -> J[a] | a -> J[b] | F
export const mapMethod = curry(($method, $args, $fm) => {
  const op = 'mapMethod()'
  const method = extract($method); const args = _extractList($args);
  const msg = `Exception thrown by map method '${method}'`
  const { shouldReturn, toReturn } = _checkExecuteMethodArgs(op, method, args, $fm)
  if (shouldReturn) return toReturn
  const o = extract($fm)
  try {
    const res = o[method](...flatArrayify(args))
    return isPromise(res) ? fPromisify(res, { op, msg }) : fonadify(res)
  } catch (e) {
    return Fault({op, msg, e})
  }
})



export const fPromisifyReflect = async ($promise, toReflect, $opts = {}) => {
  const res = await fPromisify($promise, $opts)
  return isFault(res) ? res : toReflect
}


// map ref
// try {
//   const $res = fn(val)
//   const res = extract($res)
//   return (
//     isPromise(res) ? fPromisify(res, { op, msg }) :
//     isPromise($res) ? fPromisify($res, { op, msg }) :
//     fonadify($res))
// } catch (e) {
//   return Fault({ op, msg, e })
// }
// })

// TODO: move this down when done
// TODO: can I just call map, but passthrough on non fault
// TODO: can I merge this with map, with some sort of option  RE what to return
// type checking free
export const _call = curry(($fnOrFnList, $fm) => {
  if (isArray($fnOrFnList)) {
    const fnList = _extractList($fnOrFnList)
    const returnedList = fnList.map(fn => _call(fn, $fm))
    // console.log('returnedList: ', returnedList)
    const promiseReturned = any(isPromise, returnedList)
    console.log('promiseReturned: ', promiseReturned)
    return $fm
  }
  const op = 'call()'
  const msg = 'Exception thrown by call function'
  const fn = extract($fnOrFnList); const val = extract($fm)
  try {
    const $res = fn(val)
    const res = extract($res)
    return (
      isPromise($res) ? fPromisifyReflect($res, $fm, { op, msg }) :
      isPromise(res) ? fPromisifyReflect(res, $fm, { op, msg }) :
      isFault($res) ? $res :
      $fm
    )
  } catch (e) {
    return Fault({ op, msg, e })
  }
})

// const op = 'call()'
// const fn = extract($fnOrFnList)
// try {
//   const res = fn(isJust($fm) ? extract($fm) : $fm)
//   return isFault(res) ? res : Just($fm)
// } catch (e) {
//   return Fault({ op, msg: 'Exception thrown by function', e })
// }
// })



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

export const pt = call;
export const callAsync = call

// callasync (NRJ, FOP)
//   Similar to mapAsync, but acting as a passthrough conduit
//   If isFm($fm) where $fm(v), calls fn(v), return P($fm) on success
//   If isNotFm($fm), calls fn($fm), return P(Just($fm)) on success
//   If fn() returns a F or thorw and exception, a P(Fault) is returned
//   async () -> J[a] | a -> P($fm | F)
// export const callAsync = curry(async ($asyncFn, $fm) => {
//   if (isNonJustFm($fm)) return $fm
//   const op = 'callAsync()'
//   const asyncFn = extract($asyncFn)
//   try {
//     const res = await asyncFn(extract($fm))
//     return isFault(res) ? res : Just($fm)
//   } catch (e) {
//     return Fault({op, msg: 'Exception thrown by async fn', e})
//   }
// })

export const pta = callAsync;
export const ptasync = call;

// callMethod (FOP, NJR)
//   Similar to mapMethod, but acting as a fault passthrough conduit
//   if isJust($fm), for $fm[a] calls a.method() and returns $fm on non Fault
//   if isNotFm($m), calls $fm.method() and and returns Just($fm)
//   If an exception thrown pr Fault returned upon callijng a.method(), a Fault is returned
//   'fn-name' -> [ arg1, arg2, ...] | singleArg -> J[a] | a -> $fm | F
export const callMethod = curry(($method, $args, $fm) => {
  const op = 'callMethod()'
  const args = _extractList($args)
  const method = extract($method)
  const { shouldReturn, toReturn } = _checkExecuteMethodArgs(op, method, args, $fm)
  if (shouldReturn) return toReturn
  const o = extract($fm)
  try {
    const res = o[method](...flatArrayify(args))
    return isFault(res) ? res : Just($fm)
  } catch (e) {
    return Fault({ op, msg: `Exception thrown by method '${method}'`, e })
  }
})

// callAsyncMethod (FOP, NJR)
//   Similar to mapasyncMethod, but acting as a fault or passthrough conduit
//   if isJust($fm), for fm[a] calls a.method() and returns Promise($fm) on non fault
//   if isNotFm(fm), calls fm.method() and and returns Promise(Just($fm))
//   If `method` rejects, throws an exception or returns a Fault, a representative Fault is returned
//   'fn-name' -> [ arg1, arg2, ...] | singleArg -> J[a] | a -> P($fm | F)
export const callAsyncMethod = curry(async ($method, $args, $fm) => {
  const op = 'callAsyncMethod()'
  const args = _extractList($args)
  const method = extract($method)
  const { shouldReturn, toReturn } = _checkExecuteMethodArgs(op, method, args, $fm)
  if (shouldReturn) return toReturn
  const o = extract($fm)
  try {
    const res = await o[method](...flatArrayify(args))
    return isFault(res) ? res : Just($fm)
  } catch (e) {
    return Fault({op, msg: `Exception thrown by async method '${method}'`, e})
  }
})



//*****************************************************************************
// Core Utilities
//*****************************************************************************

// fPromisify
//   Turn a promise into a fonadic promise (i.e. a promise that contains a fonad)
//   Resolved prmoise values will be wrapped in a J
//   Rejected prmoise values will be wrapped in a F
//   Thrown exception info captured in a F
export const fPromisify = async ($promise, $opts = {}) => {
  const { op, msg } = extract($opts)
  try {
    return fonadify(await extract($promise))
  } catch (e) {
    return Fault({ op, msg, e })
  }
}

// extract
//   Extract the value being held/reprsented by a monad
//   extract(J(v)) -> v
//   extract(Nothing) -> nothing._emptyVal
//   extract(Ok) -> true
//   extract(Fault) -> false
//   extract(Passthrough(fmToPassthrough:)) -> fmToPassthrough
//   extract(v) -> v
export const extract = $fm => {
  if (isNotFm($fm)) return $fm
  if (isJust($fm)) return $fm._val
  if (isNothing($fm)) return $fm._emptyOrNilVal
  if (isOk($fm)) return true
  if (isFault($fm)) return false
  if (isPassthrough($fm)) return $fm._fmToPassthrough
  return $fm
}

// ---------------------------------- above the line



// TODO: make chain handle async fns correctly
//
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
    return Fault({ op, msg: 'Exception thrown by chain function', e })
  }
})


// map a function over a list of $fm's
// TODO: test the crap out of this
// TODO: is there a different way to do this (like map(R.map) kind of thing?)
// very experimental
export const mapOver = curry(($fn, $fmList) => {
  const list = _extractList($fmList)
  const fn = extract($fn)
  // TODO: if any of the results in the list are a fault, return fauult instead???
  return Just(list.map($fm => map(fn, $fm)))
})

// TODO: doc & test
export const mapTo = curry(($fn, fmMapToHere, $fm) => {
  const fn = extract($fn)
  const res = fn(extract($fm))
  fonadify(convertToJust(res, fmMapToHere))
  return $fm
})


// return a status message
export const statusMsg = fm => (isFm(fm) ? fm._statusMsg() : `WARNING: can't get status for non-fm: ${json(fm)}`)

// return exception message if Fault with exception, otherwise ''
export const exceptionMsg = fault =>
  isFault(fault) && fault._e && fault._e.message ? fault._e.message : ''

// return a resonable string representation of a monad
export const inspect = fm => (isFm(fm) ? fm._inspect() : `WARNING: cant inspect non-monad: ${fm}`)

// Add note to FM
// note = 'msg' or { op, msg, code, here }
export const addNote = curry(($note, $fm) => {
  const fm = isFm($fm) ? $fm : Just($fm)
  const fullNote = codeInfoOrStr(extract($note))
  fm._prependNote(extract(fullNote))
  return fm
})

// TODO: doc & test
export const addNoteIf = curry(async ($condOrPred, $note, $fm) =>
  (await _check($condOrPred, $fm) ? addNote(extract($note), $fm) : $fm))

// TODO: doc & test
export const addClientErrMsg = curry(($msg, $fm) => {
  if (isFault($fm)) $fm._clientMsg = extract($msg)
  return $fm
})

// TODO: doc & test
export const addClientErrMsgIf = curry(async ($condOrPred, $msg, $fm) =>
  (await _check($condOrPred, $fm) ? addClientErrMsg($msg, $fm) : $fm))

// TODO: doc & test
// refectlivy add error message to Fault
export const addErrCode = curry(($code, $fm) => {
  if (isFault($fm)) $fm._code = extract($code)
  return $fm
})

export const addErrCodeIf = curry(async ($condOrPred, $code, $fm) =>
  (await _check($condOrPred, $fm) ? addErrCode($code, $fm) : $fm))

//*****************************************************************************
// Extended Monadic Interface
//*****************************************************************************

// mapAsyncOld (NJR)
//   map an async function over a fonad, returning the result in a promise
//   If asyncFn rejects of throws an exception, a representative Fault is returned
//   if isFm(a) and isNotJust(a), reflects fm
//   async(a->b) -> Just(a) | a -> P(Just(b)| Fault)
// export const mapAsyncDeprecate = curry(async ($asyncFn, $fm) => {
//   if (isNonJustFm($fm)) return $fm
//   const op = 'mapAsync()'
//   const asyncFn = extract($asyncFn)
//   try {
//     return fonadify(await asyncFn(extract($fm)))
//   } catch (e) {
//     return Fault({ op, msg: 'Exception thrown by async fn', e })
//   }
// })

// export const mapAsyncMethod = curry(async ($method, $args, $fm) => {
//   const op = 'mapAsyncMethod()'
//   const args = _extractList($args)
//   const method = extract($method)
//   const { shouldReturn, toReturn } = _checkExecuteMethodArgs(op, method, args, $fm)
//   if (shouldReturn) return toReturn
//   const o = extract($fm)
//   try {
//     return Just(await o[method](...flatArrayify(args)))
//   } catch (e) {
//     return Fault({op, msg: `Exception thrown by async map method '${method}'`, e})
//   }
// })


// mapAsyncMethod (NJR)
//   map an an async class method over a fonad, returning the result in a promise
//   if isJust($fm), for fm[a] calls a.method() and returns a promisified Just(result)
//   if isNotFm(fm), calls fm.method() and and returns a promisified Just(result)
//   If `method` rejects of throws an exception, a representative Fault is returned
//   'fn-name' -> [ arg1, arg2, ...] | singleArg -> J[a] | a -> P(J[b] | F)
// export const mapAsyncMethodDeprecated = curry(async ($method, $args, $fm) => {
//   const op = 'mapAsyncMethod()'
//   const args = _extractList($args)
//   const method = extract($method)
//   const { shouldReturn, toReturn } = _checkExecuteMethodArgs(op, method, args, $fm)
//   if (shouldReturn) return toReturn
//   const o = extract($fm)
//   try {
//     // return Just(await o[method](...flatArrayify(args)))
//     return fonadify(await o[method](...flatArrayify(args)))
//   } catch (e) {
//     return Fault({ op, msg: `Exception thrown by async map method '${method}'`, e })
//   }
// })


export const callIf = curry(async ($condOrPred, $fnOrFnList, $fm) => {
  if (isNonJustFm($fm)) return $fm
  if (await _check($condOrPred, $fm)) return call($fnOrFnList, $fm)
  return $fm
})


export const callOnFault = curry(($fnOrFnList, fault) => {
  if (isNotFault(fault)) return fault
  return _call($fnOrFnList, fault)
})


// callMethodIf (FOP | NJR)
//   TODO: doc & test
//  ifIsFunc(condOrPred) calls method if condOrPred($fm) is true
//  ifIsNotFunc(condnOrPred) calls method if condnOrPred itself is true
export const callMethodIf = curry(async ($condOrPred, $method, $args, $fm) => {
  if (isNonJustFm($fm)) return $fm
  if (await _check($condOrPred, $fm)) return callMethod($method, $args, $fm)
  return $fm
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
    return Fault({ op, msg: `Exception thrown during constrcution of class ${className}`, e })
  }
})



// export const defer = con => fn => fn(con)
export const defer = fn => con => fn(con)


// Returns { shouldReturn: bool, toReturn: a }
// Note that op/method/args are raw (i.e. not monadic)
const _checkExecuteMethodArgs = (op, method, args, $fm) => {
  const r = (shouldReturn, toReturn) => ({ shouldReturn, toReturn })
  if (isNonJustFm($fm)) return r(true, $fm)
  const o = extract($fm)
  if (isNotObject(o)) return r(true, Fault({ op, msg: `Non object supplied: ${$fm}` }))
  if (isNotFunction(o[method])) return r(true, Fault({ op, msg: `Method '${method}' does not exist on object: ${str(o)}` }))
  return r(false, 'args are good')
}


// TODO: this is in the heart, test very well
// returns true if all preds pass, otherwise false
// accomadates mixture of sycn and async functions in the list
export const checkPredList = curry(async ($predList, $fm) => {
  const predList = _extractList($predList)
  const results = await Promise.all(predList.map(async pred => pred(extract($fm))))
  return all(isTruthy, results)
})

// TODO: this is in the heart, test very well
// TODO: for preds, check to see if is monadic type cheker pred (add tag to monadic type checkiners)
//       and if so, apply pred the the monad, otherwise apply to extract($fm)
// $conditions can be
//   * hardCondition: evaluated for truthyness
//   * predFn: single pred, evaluates pred(fm) (pred can be sycn or ansycn)
//   * [ hardConditions &| predFns]

const _check = async (condOrPred, fm) => {
  // console.log('~~> _check()');
  // console.log('condOrPred: ', condOrPred)
  // console.log('fm: ', fm)
  // console.log('condOrPred(fm): ', condOrPred(fm))
  // const conditions = _extractList($conditions)
  // const hardConditions = conditions.filter(isNotFunction)
  // const preds = conditions.filter(isFunction)
  // const predsPass = await checkPredList(preds, $fm)
  // const hardsPass = all(isTruthy, hardConditions)
  // return hardsPass & predsPass

  return isFunction(condOrPred) ? condOrPred(fm) : !!condOrPred
}

const _extractList = $list => flatArrayify(extract($list)).map($v => extract($v))

//*****************************************************************************
// Flow control functions
//*****************************************************************************

// TODO: test very well, better docs
// TODO: reaxify, use forEach instead of for loop
// TODO: take in list of preds as well as pred
// Recieves fm and a predicated action list: [ [p1,a1a,a1b,...], [p2,a2a,a2b,...], ... ]
//   predActions[0] = predicate.  Will be mapped over fm as fm -> bool.  Example predicates: isJust, isOk, isFault, isNil, etc.
//   predActions[1..n] = list of fxns to pipe together, with fm as input, if predActions[0] evalues to true
//     pipe(predActions[1], predActions[2], ...)(fm).
// For the first predicate that evalutes to true, predActions[1..n] are piped together and the result is returned
// You can use orElse as a predicate for the last entry in the list to define default behaviour
// If none of the predicates evalute to true, an exception is thrown if `exceptionOnNoMatch`, otherwise fm is returned
// bool -> [ [p1,a1], [p2,a2], ... ] -> fm -> F | a
const _caseOf = (exceptionOnNoMatch, predActions, $fm ) => {
  const fm = extract($fm)
  for (let i = 0; i < predActions.length; i++) {
    const pred = predActions[i][0];
    const actionList = drop(1,predActions[i])
    if (pred(fm)) {
      return pipe(...actionList)(fm);
    }
  }
  throwIf(exceptionOnNoMatch, `caseOf() did not find match for monad: ${fm}`);
  return fm;
}

export const caseOfStrict = curry((predActions, fm) => _caseOf(true, predActions, fm)); // throws exception upon no match
export const caseOf = curry((predActions, fm) => _caseOf(false, predActions, fm)); // returns fm upon no match

// Use with CaseOf as a fallback predicate action
export const orElse = () => true

// will handle async preds
export const passthroughIf = curry(async (condOrPred, $fm) =>
  (await _check(condOrPred, $fm) ? Passthrough($fm) : $fm))

export const returnIf = passthroughIf

// TODO: test
// Will transfer any notes from an incoming FM
export const faultIf = curry(async (condOrPred, faultOptions, $fm) => {
  if (await _check(condOrPred, $fm)) {
    const fault = Fault(faultOptions)
    if ( isFm($fm) && $fm._notes.length) fault._setNotes($fm._notes)
    return fault
  }
  return $fm
})

//*****************************************************************************
// Operate on monadic data
//*****************************************************************************

export const fIsArray = $fm => isArray(extract($fm))

export const fEq = curry(($val, $fm) => extract($val) === extract($fm))
export const fProp = curry(($propName, $fm) => prop(extract($propName), extract($fm)))


export const fIncludes2 = curry(($val, $fmList) => {
  const val = $val
  const list = $fmList
  return includes(val, list)
})


export const fIncludes = curry(($val, $fmList) =>
  Just(fIsArray($fmList) && includes(extract($val), extract($fmList))))

//*****************************************************************************
// Logging
//*****************************************************************************

export const fStr = $fm => str(extract($fm))
export const fStrPretty = $fm => json(extract($fm))

// logMsg (PT)
//   Log a message, passing through $fm
//   'msg' -> fm -> fm
export const logMsg = curry(($msg, fm) => {
  console.log(extract($msg))
  return fm
})

export const logMsgIf = curry(async ($condOrPred, $msg, $fm) =>
  (await _check($condOrPred, $fm) ? logMsg(extract($msg), $fm) : $fm))

// log (PT)
//   Log and return fmOrVal.
//   if isFm(fmOrVal) logs fmOrVal._inspect
//   fm -> fm
export const log = fmOrVal => {
  if (isFm(fmOrVal)) console.log(inspect(fmOrVal))
  else console.log('Non FM:', fmOrVal)
  return fmOrVal
}

export const logIf = curry(async ($condOrPred, $fm) => {
  await _check($condOrPred, $fm) && log($fm)
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

export const logRawWithMsg = curry(($msg, fmOrVal) => {
  console.log(extract($msg))
  return logRaw(fmOrVal)
})


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

export const logStatusWithMsg = curry(($msg, fmOrVal) => {
  console.log(extract($msg))
  return logStatus(fmOrVal)
})

// reflectivly log a supplied value
export const logVal = curry((val, fm) => {
  console.log(val)
  return fm
})

// reflectivly log a message and supplied value
export const logValWithMsg = curry((msg, val, fm) => {
  console.log((msg))
  return logVal(val, fm)
})



//*****************************************************************************
// Monadic helpers
//*****************************************************************************

// TODO: test throuroughly

export const fonadify = $a =>
  isEmptyOrNilJust($a) ? Nothing($a._val) :
  isFm($a) ? $a :
  isEmptyOrNil($a) ? Nothing($a) :
  isError($a) ? Fault({ e: $a }) :
  Just($a)

// propagate (NJR)
//   TODO: docs
//   TODO: test
//   if isJust(fm) | isNotFm(fm), returns toPropagate
//   this allows a new value to be inserted in to the pipeline on non error states

export const propagate = curry(($toPropagate, fm) =>
  (isJust(fm) || isNotFm(fm) ? Just($toPropagate) : fm))

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





// from https://github.com/jperasmus/pipe-then
// var _pipe = function pipe() {
//   for (var _len = arguments.length, functions = Array(_len), _key = 0; _key < _len; _key++) {
//     functions[_key] = arguments[_key];
//   }

//   return function(input) {
//     return functions.reduce(function(chain, func) {
//       return chain.then(func);
//     }, Promise.resolve(input));
//   };
// };


// FMN Pipelines only allow Just() to enter the pipeline, reflects non-Just
// Also unwraps Passthroughs at the end of the pipeline

export const done = $fm => (isPassthrough($fm) ? $fm._fmToPassthrough : $fm)
export const appendAddAsyncFn = (promiseChain, curFn) => promiseChain.then(curFn)

// converts exceptions to faults wrapped in promise
const fAwait = async promise => {
  if (!isPromise(promise)) return promise
  try {
    return await promise
  } catch (e) {
    return Fault({ e })
  }
}

export const pipeAsyncFm = (...funcs) => async x => {
  const resolvedX = await fAwait(x)
  return isNonJustFm(resolvedX) ? done(resolvedX) : [...funcs, done].reduce(appendAddAsyncFn, Promise.resolve(x))
}

export const pipeFm = (...funcs) =>
  x => (isNonJustFm(x) ? done(x) : pipe(...[...funcs, done])(x))

const h = here
export { Just, Nothing, Ok, Fault, Passthrough }
export { pipeAsync, composeAsync, reflect, here, h }

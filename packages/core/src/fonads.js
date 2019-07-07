// TODO:
// * For Any function calling a supplied function (predCheck, callIf, caseOf, predlist, etc), handle async input fns
// * Let caseOf recieve predOrHard list
// * update fns to accept fm wrapped in promise ???  Probably not since pipeline handles promises so well
// * Add new notes/here stuff into viz

import { curry, prop, propEq, complement, includes, drop, pipe, keys, all, any, find } from 'ramda'
import { isObject, isFunction, isNotFunction, isNotObject, isArray, isTruthy, isPromise } from 'ramda-adjunct'
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
  const fn = extract($fn)
  const fonadOperation = isFm($fm) && fn.isFonadOperator
  const val = fonadOperation ? $fm : extract($fm)
  try {
    const $res = fn(val)
    const res = fonadOperation ? $res : extract($res)
    return (
      isPromise(res) ? fPromisify(res, { op, msg }) :
      isPromise($res) ? fPromisify($res, { op, msg }) :
      fonadify($res))
  } catch (e) {
    return Fault({ op, msg, e })
  }
})

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
  const { shouldReturn, toReturn } = _checkMapMethodArgs(op, method, args, $fm)
  if (shouldReturn) return toReturn
  const o = extract($fm)
  try {
    const res = o[method](...flatArrayify(args))
    return isPromise(res) ? fPromisify(res, { op, msg }) : fonadify(res)
  } catch (e) {
    return Fault({op, msg, e})
  }
})

// call [ sync | async, NJR ]
//   Similar to map, but acting as a fault or passthrough conduit
//   Calls all funtions sequentially supplying $fm as the arg
//   Returns Promise($fm) if none of the fns
//    throw/reject/return-fault, otherwise returns Promise(F)
//   In the case of multiple fns, Promise($fm) a promise is always returned (in case any of fns asycn // TODO: this can change callFnList is smarter bout promises vs. no promises
//   In the case of a single non-async fn, the output is the same as described above, but not wrapped in a promise
//   () | [ () ]-> J[a] | a -> $fm | F
export const call = curry(($fnOrFnList, $fm) => {
  if (isNonJustFm($fm)) return $fm
  return _call($fnOrFnList, $fm)
})

// shortcut for call
export const pt = call;

// callMethod [ sync | async, NJR ]
//   Similar to mapMethod, but acting as a fault passthrough conduit
//   if isJust($fm), for $fm[a] calls a.method() and returns $fm on non Fault
//   if isNotFm($m), calls $fm.method() and and returns Just($fm)
//   If an exception thrown pr Fault returned upon callijng a.method(), a Fault is returned
//   'fn-name' -> [ arg1, arg2, ...] | singleArg -> J[a] | a -> $fm | F
export const callMethod = curry(($method, $args, $fm) => {
  if (isNonJustFm($fm)) return $fm
  const res = mapMethod($method, $args, $fm)
  return isPromise(res) ?
    res.then(resolvedRes => Promise.resolve(isFault(resolvedRes) || $fm)) :
    isFault(res) || $fm
})

// chain [ sync | async, NJR ]
//   Can accept either a monad, or a raw value to be chained thorugh `fn`
//   If isFm($fm) where $fm(v), returns result of calling fn(v)
//   If isNotFm($fm), returns result of calling fn($fm)
//   If an exception is thrown as a result of calling fn, a Fault is returned
//   If $fn is asycn, returns as described above, wrapped in a promise
//   (a->b) -> J[a] | a -> b | F
export const chain = curry(($fn, $fm) => {
  if (isNonJustFm($fm)) return $fm
  const res = map($fn,  $fm)
  return isPromise(res) ?
    res.then(resolvedRes => Promise.resolve(isFault(resolvedRes) || extract(res))) :
    isFault(res) || extract(res)
})

// core interface helpers

// type checking free
export const _call = curry(($fnOrFnList, $fm) => {
  if (isArray($fnOrFnList)) return _callFnListAsync($fnOrFnList, $fm)
  const res = map($fnOrFnList, $fm)
  return isPromise(res) ?
    res.then(resolvedRes => Promise.resolve(isFault(resolvedRes) || $fm)) :
    isFault(res) || $fm
})

export const _callFnListAsync = async ($fnList, $fm) => {
  let fault = null
  const callList = _extractList($fnList).map(async fn => {
    const res = await call(fn, $fm)
    !fault && isFault(res) && (fault = res)
  })
  await Promise.all(callList)
  return fault || $fm
}

// TODO: make this guy work,
// const _captureFirstFault = (capturedFaultOrNull, maybeFault) =>
//   !capturedFaultOrNull && isFault(maybeFault) ? maybeFault : null

// export const _callFnList = async ($fnList, $fm) => {
//   let fault = null
//   const resList = _extractList($fnList).map(fn => {
//     const res = call(fn, $fm)
//     if (isPromise(res)) {
//       return res.then(resolvedRes => {
//         fault = _captureFirstFault(fault, resolvedRes)
//         return Promise.resolve(isFault(resolvedRes) || $fm)
//       })
//     } else {
//       fault = _captureFirstFault(fault, res)
//       return Promise.resolve(isFault(res) || $fm)

//     }
//   })
//   if (any(isPromise, resList)) {
//     return Promise.all(resList).then(() => fault || $fm)
//   } else {
//     return fault || $fm
//   }
// }

// Returns { shouldReturn: bool, toReturn: a }
// Note that op/method/args are raw (i.e. not monadic)
const _checkMapMethodArgs = (op, method, args, $fm) => {
  const r = (shouldReturn, toReturn) => ({ shouldReturn, toReturn })
  if (isNonJustFm($fm)) return r(true, $fm)
  const o = extract($fm)
  if (isNotObject(o)) return r(true, Fault({ op, msg: `Non object supplied: ${$fm}` }))
  if (isNotFunction(o[method])) return r(true, Fault({ op, msg: `Method '${method}' does not exist on object: ${str(o)}` }))
  return r(false, 'args are good')
}

//*****************************************************************************
// Core Utilities
//*****************************************************************************

// TODO: doc & test
export const mapTo = curry(($fn, fmMapToHere, $fm) => {
  const fn = extract($fn)
  const res = fn(extract($fm))
  fonadify(convertToJust(res, fmMapToHere))
  return $fm
})

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

export const fPromisifyReflect = async ($promise, toReflect, $opts = {}) => {
  const res = await fPromisify($promise, $opts)
  return isFault(res) ? res : toReflect
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

// adds 'isFonadOperator' to final and all partially curriend functions
// TODO:
//   make 'tag' as an optional input to fCurry, so that anybody can use it
//   implmenet placeholders
export function fCurry(fn) {
  var args = [].slice.call(arguments)
  var typeOfFn = typeof fn

  if (typeOfFn !== 'function' ) throw new Error('auto-curry: Invalid parameter. Expected function, received ' + typeOfFn)
  if (fn.length <= 1) {
    fn.isFonadOperator = true
    return fn
  }
  if (args.length - 1 >= fn.length) {
    const fnToReturn = fn.apply(this, args.slice(1))
    fnToReturn.isFonadOperator = true
    return fnToReturn
  }
  const fnToReturn = function() {
    return fCurry.apply(this, args.concat([].slice.call(arguments)))
  };
  fnToReturn.isFonadOperator = true
  return fnToReturn
};

export const fonadify = $a =>
  isEmptyOrNilJust($a) ? Nothing($a._val) :
  isFm($a) ? $a :
  isEmptyOrNil($a) ? Nothing($a) :
  isError($a) ? Fault({ e: $a }) :
  Just($a)

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

const _extractList = $list => flatArrayify(extract($list)).map($v => extract($v))

// ---------------------------------- above the line

// export const defer = con => fn => fn(con)
// TODO: is this useful (kindof a functionify??)
export const defer = fn => con => fn(con)

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

//*****************************************************************************
// Pipeline functions
//*****************************************************************************

// TODO: get smartpipe to work
// from https://github.com/jperasmus/pipe-then
// var _pipe = function pipe() {
//   for (var _len = arguments.length, functions = Array(_len), _key = 0; _key < _len; _key++) {
//     functions[_key] = arguments[_key];Xw
//   }

//   return function(input) {
//     return functions.reduce(function(chain, func) {
//       return chain.then(func);
//     }, Promise.resolve(input));
//   };
// };

// FM Pipelines only allow Just() to enter the pipeline, reflects non-Just
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

//*****************************************************************************
// Fonad operators (operate directly on fonad as opposed to a wrapped value)
//*****************************************************************************

// All fonad operators use fCurry, which tags fnxs with prop isFonadOperator=true
// which allows map to know when to operate directly on the fm, or the conatained value

// TODO: all of these need to be documented and tested

// Add note to FM
// note = 'msg' or { op, msg, code, here }
export const addNote = fCurry(($note, $fm) => {
  const fm = isFm($fm) ? $fm : Just($fm)
  const fullNote = codeInfoOrStr(extract($note))
  fm._prependNote(extract(fullNote))
  return fm
})

export const addClientErrMsg = fCurry(($msg, $fm) => {
  if (isFault($fm)) $fm._clientMsg = extract($msg)
  return $fm
})

// refectlivy add error message to Fault
export const addErrCode = fCurry(($code, $fm) => {
  if (isFault($fm)) $fm._code = extract($code)
  return $fm
})

// conditional fonad operators

export const addNoteIf = curry(async ($condOrPred, $note, $fm) =>
  (await check($condOrPred, $fm) ? addNote(extract($note), $fm) : $fm))

export const addClientErrMsgIf = curry(async ($condOrPred, $msg, $fm) =>
  (await check($condOrPred, $fm) ? addClientErrMsg($msg, $fm) : $fm))

export const addErrCodeIf = curry(async ($condOrPred, $code, $fm) =>
  (await check($condOrPred, $fm) ? addErrCode($code, $fm) : $fm))



//*****************************************************************************
// Conditional Fonad operators
//*****************************************************************************

// TODO: doc & test
export const callIf = curry(async ($condOrPred, $fnOrFnList, $fm) => {
  if (isNonJustFm($fm)) return $fm
  if (await check($condOrPred, $fm)) return call($fnOrFnList, $fm)
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
  if (await check($condOrPred, $fm)) return callMethod($method, $args, $fm)
  return $fm
})
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

const check = async (condOrPred, fm) => {
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
  (await check(condOrPred, $fm) ? Passthrough($fm) : $fm))

export const returnIf = passthroughIf

// TODO: test
// Will transfer any notes from an incoming FM
export const faultIf = curry(async (condOrPred, faultOptions, $fm) => {
  if (await check(condOrPred, $fm)) {
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
// Logging and messaging
//*****************************************************************************

// return a status message
export const statusMsg = fm => (isFm(fm) ? fm._statusMsg() : `WARNING: can't get status for non-fm: ${json(fm)}`)

// return exception message if Fault with exception, otherwise '' (for testing)
export const getExceptionMsg = fault =>
  isFault(fault) && fault._e && fault._e.message ? fault._e.message : ''

export const getNotes = fm => (isFm(fm) ? fm._notes : [])

// return a resonable string representation of a monad
export const inspect = fm => (isFm(fm) ? fm._inspect() : `WARNING: cant inspect non-monad: ${fm}`)


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
  (await check($condOrPred, $fm) ? logMsg(extract($msg), $fm) : $fm))

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
  await check($condOrPred, $fm) && log($fm)
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

const h = here
export { Just, Nothing, Ok, Fault, Passthrough }
export { pipeAsync, composeAsync, reflect, here, h }

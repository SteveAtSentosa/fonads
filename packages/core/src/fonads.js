// TODO:

// CORE TODO:
// * Formalize concept of action list, which can be parallel, pipeline, passthrough, etc (see notes for caseOf)
// * Seems like things are getting shakey, do a careful think on concepts, approaches, and see if I can codify them
//   and they make sense and will always be consistent (think isFonadOperator, when to reflect, etc etc)
//   - is there a way to auto handle promise vs. non promise based check (this is core)
//   - pomise based vs non-promised base pipe?
// * Very careful readthrough
//   - make sure all conditionals and condtional checks are returning Faults when needed (everywhere check is called could return a fult)
//   - Make sure calling _shouldReflect everywhere needed
//   - Very careful focus on conditionals (these are still sloppy)
//   - General correctness
// * More thourough tests of conditionals, and condtional failures !
// * Passthrough -> Inert ?
// * NJR -> fault or pasthrough reflective ?
// * Careful examination of application of isFault vs. isNonJustFm
// * pipelFm ... only direclty reflect Faults


// TODO: final push

import { curry, prop, propOr, propEq, complement, includes, drop, pipe, keys, any, all, find } from 'ramda'
import {
  isObject, isFunction, isNotFunction, isNotObject,
  isArray, isFalsy, isPromise, isNilOrEmpty, isTruthy
} from 'ramda-adjunct'
import { flatArrayify, isEmptyOrNil } from './utils/types'
import { isError, here, throwIf } from './utils/error'
import { codeInfoOrStr, str, json } from './utils/string'
import { pipeAsync, composeAsync, fCurry, reflect } from './utils/fn'

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
isFm.fonadQuery = 'isFm'; isNotFm.fonadQuery = 'isNotFm';

// 'type' -> fm -> bool
export const isType = curry((type, fm) => isFm(fm) && propEq('_type', type, fm))
export const isNotType = complement(isType)
isType.fonadQuery = 'isType'; isNotType.fonadQuery = 'isNotType'

// fm -> bool
export const isJust = isType('Just')
export const isNotJust = complement(isJust)
isJust.fonadQuery = 'isJust'; isNotJust.fonadQuery = 'isNotJust'

// fm -> bool
export const isFault = isType('Fault')
export const isNotFault = complement(isFault)
isFault.fonadQuery = 'isFault'; isNotFault.fonadQuery = 'isNotFault'

// fm -> bool
export const isNothing = isType('Nothing')
export const isNotNothing = complement(isNothing)
isNothing.fonadQuery = 'isNothing'; isNotNothing.fonadQuery = 'isNotNothing'

// fm -> bool
export const isOk = isType('Ok')
export const isNotOk = complement(isOk)
isOk.fonadQuery = 'isOk'; isNotOk.fonadQuery = 'isNotOk'

// fm -> bool
export const isPassthrough = isType('Passthrough')
export const isNotPassthrough = complement(isPassthrough)
isPassthrough.fonadQuery = 'isPassthrough'; isNotPassthrough.fonadQuery = 'isNotPassthrough'

// fm -> bool
export const isValue = fm => isJust(fm) || isFault(fm) || isNothing(fm)
export const isNotValue = complement(isValue)
isValue.fonadQuery = 'isValue'; isNotValue.fonadQuery = 'isNotValue'

// fm -> bool
export const isStatus = fm => isOk(fm) || isFault(fm)
export const isNotStatus = complement(isStatus)
isStatus.fonadQuery = 'isStatus'; isNotStatus.fonadQuery = 'isNotStatus'

// fm -> bool
// returns true if isFm(fm) && isNotJust(fm), otherwise returns false
export const isNonJustFm = fm => isFm(fm) && isNotJust(fm)
isNonJustFm.fonadQuery = 'isNonJustFm'

// fm -> bool
export const isEmptyOrNilJust = fm => isJust(fm) && isEmptyOrNil(fm._val)
isEmptyOrNilJust.fonadQuery = 'isEmptyOrNilJust'

// fm -> truthy | false
// returns fm on match, otherwise returns false
export const isFaultOrPassthrough = fm => isFm(fm) && (isFault(fm) || isPassthrough(fm))
isFaultOrPassthrough.fonadQuery = 'isFaultOrPassthrough'

export const isFonadQuery = $fn => !!(isFunction($fn) && extract($fn).fonadQuery)
export const isNotFonadQuery = complement(isFonadQuery)

export const isFonadUpdater = $fn => !!(isFunction($fn) && extract($fn).fonadUpdater)
export const isNotFonadUpdater = complement(isFonadUpdater)

export const isFonadOperator = $fn => isFonadQuery($fn) || isFonadUpdater($fn)
export const isNotFonadOperator = complement(isFonadOperator)


export const anyIsFonadOperator = $fnOrFnList => any(isFonadOperator, flatArrayify($fnOrFnList))
export const noneAreFonadOperators = complement(anyIsFonadOperator)

export const anyIsFonadQuery = $fnOrFnList => any(isFonadQuery, flatArrayify($fnOrFnList))
export const noneAreFonadQuery = complement(anyIsFonadQuery)

export const isJustTruthy = fm => isJust(fm) && isTruthy(extract(fm))


//*****************************************************************************
// Core interface
//*****************************************************************************

// map [ sync | async, NJR ]
//   Return result of calling $fn($fm) wrapped in a Just
//   If an exception is thrown as a result of calling fn, a Fault is returned
//   $fn is async, same behaviour, except enclosed in a promise
//   If $fn is a fonadic operator, $fn is applied directly to fm, rather than it's contents
//   (a->b) -> J[a] | a -> J[b] | F | Promise(J[b] | F)
export const map = curry(($fn, $fm) => {
  if (isPromise($fm)) return $fm.then(resolvedFm => map($fn, resolvedFm))
  if (isPassthrough($fm)) return $fm
  if (isNonJustFm($fm) && isNotFonadOperator($fn)) return $fm
  const op = 'map()'
  const msg = 'Exception thrown by map function'
  const fn = extract($fn)
  const fonadOperation = isFm($fm) && isFonadOperator(fn)
  const val = fonadOperation ? $fm : extract($fm)
  try {
    const $res = fn(val)
    // in case fonad operator returns itself
    const res = fonadOperation ? $res : extract($res)
    return (
      isPromise(res) ? fPromisify(res, { op, msg }) :
      isPromise($res) ? fPromisify($res, { op, msg }) :
      fonadify($res))
  } catch (e) {
    return Fault({ op, msg, e })
  }
})

// chain [ sync | async, NJR ]
//   Can accept either a monad, or a raw value to be chained thorugh `fn`
//   If isFm($fm) where $fm(v), returns result of calling fn(v)
//   If isNotFm($fm), returns result of calling fn($fm)
//   If an exception is thrown as a result of calling fn, a Fault is returned
//   If $fn is asycn, returns as described above, wrapped in a promise
//   If $fn is a fonadQuery, $fn is applied directly to fm, rather than it's contents
//   If $fn is a fonadUpdater, a fault is thrown (as knowing what to extract is ambiguous)
//   (a->b) -> J[a] | a -> b | F
export const chain = curry(($fn, $fm) => {
  if (isPromise($fm)) return $fm.then(resolvedFm => chain($fn, resolvedFm))
  if (isPassthrough($fm)) return $fm
  if (isNonJustFm($fm) && isNotFonadOperator($fn)) return $fm
  if (isFonadUpdater($fn)) return Fault({op: 'chain()', msg: 'fonad updater functions can not be supplied to chain'})
  const res = map($fn,  $fm)
  return isPromise(res) ?
    res.then(resolvedRes => Promise.resolve(isFault(resolvedRes) ? resolvedRes : extract(resolvedRes))) :
    isFault(res) ? res : extract(res)
    // I was thinking if non just FM returned, just reflect it, extracting does not make sense, but now
    // I am thinking it might, like extracting from Nothing gives you nu7ll
    // res.then(resolvedRes => Promise.resolve(isJust(resolvedRes) ? extract(resolvedRes) : resolvedRes)) :
    // isJust(res) ? extract(res) : res
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
  if (isPromise($fm)) return $fm.then(resolvedFm => mapMethod($method, $args, resolvedFm))
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

// TODO: completely untested, currenly being used for testing
const raw = true
export const chainMethod = curry(($method, $args, $fm) => {
  if (isPromise($fm)) return $fm.then(resolvedFm => chainMethod($method, $args, resolvedFm))
  const res = mapMethod($method, $args, $fm)
  return isPromise(res) ? fPromisify(extract(res), { raw }) : extract(res)
})


// call [ sync | async, NJR ]
//   Similar to map, but acting as a fault or passthrough conduit
//   Calls all funtions sequentially supplying $fm as the arg
//   Returns Promise($fm) if none of the fns throw/reject/return-fault, otherwise returns Promise(F)
//   In the case of multiple fns, Promise($fm) a promise is always returned
//   In the case of a single non-async fn, the output is the same as described above, but not wrapped in a promise
//   () | [ () ]-> J[a] | a -> $fm | F
export const call = curry(($fnOrFnList, $fm) => {
  if (isPromise($fm)) return $fm.then(resolvedFm => call($fnOrFnList, resolvedFm))
  if (isPassthrough($fm)) return $fm
  if (noneAreFonadOperators(_extractList($fnOrFnList)) && isNonJustFm($fm)) return $fm
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
  if (isPromise($fm)) return $fm.then(resolvedFm => callMethod($method, $args, resolvedFm))
  if (isNonJustFm($fm)) return $fm
  const res = mapMethod($method, $args, $fm)
  return isPromise(res) ?
    res.then(resolvedRes => Promise.resolve(isFault(resolvedRes) ? resolvedRes : $fm)) :
    isFault(res) ? res : $fm
})

// core interface helpers

// // TODO: get this one right ... or just check in functions ... probably better
// const _shouldReflect = ($fm, $fnOrFnList=[] ) => {
//   if (any(isFonadOperator, _extractList($fnOrFnList))) return false
//   return isNonJustFm($fm)
//   // return !any(isFonadOperator, _extractList($fnOrFnList)) && isNonJustFm($fm)
// }

// type checking free
export const _call = curry(($fnOrFnList, $fm) => {
  if (isArray($fnOrFnList)) return _callFnListAsync($fnOrFnList, $fm)
  const res = map($fnOrFnList, $fm)
  return isPromise(res) ?
    res.then(resolvedRes => Promise.resolve(isFault(resolvedRes) ? resolvedRes : $fm)) :
    isFault(res) ? res : $fm
})

const _callFnListAsync = ($fnList, $fm) => {
  const final = async v => { const res = await v; return isFault(res) ? res : $fm }
  const callList = _extractList($fnList)
  const mapList = callList.map(fn => async v => {
    const res = await _call(fn,v)
    return isFault(res) ? res : $fm
  })
  return pipeAsync(...mapList, final)($fm)
}

// Returns { shouldReturn: bool, toReturn: a }
// Note that op/method/args are raw (i.e. not monadic)
const _checkMapMethodArgs = (op, method, args, $fm) => {
  const r = (shouldReturn, toReturn) => ({ shouldReturn, toReturn })
  if (isNonJustFm($fm)) return r(true, $fm)
  const o = extract($fm)
  if (isNotObject(o)) return r(true, Fault({ op, msg: `For method '${method}', non object supplied: ${json(o)}` }))
  if (isNotFunction(o[method])) return r(true, Fault({ op, msg: `Method '${json(method)}' does not exist on object: ${json(o)}` }))
  return r(false, 'args are good')
}

//*****************************************************************************
// Core Utilities
//*****************************************************************************

// TODO: doc & test
export const mapTo = curry(($fn, fmMapToHere, $fm) => {
  if (isPromise($fm)) return $fm.then(resolvedFm => mapTo($fn, fmMapToHere, resolvedFm))
  if (isPassthrough($fm)) return $fm
  if (isNonJustFm($fm) && isNotFonadOperator($fn)) return $fm
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
  const { op, msg, raw } = extract($opts)
  try {
    const res = await extract($promise)
    return raw ? extract(res) : fonadify(res)
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

export const fonadify = $a =>
  isEmptyOrNilJust($a) ? Nothing($a._val) :
  isFm($a) ? $a :
  isEmptyOrNil($a) ? Nothing($a) :
  isError($a) ? Fault({ e: $a }) :
  Just($a)

// TODO: check for promise($fm)
// TODO: think this one through RE how to handle incoming fm and reflection
export const propagate = curry(($toPropagate, fm) => {
  if (isFaultOrPassthrough(fm)) return fm
  return fonadify($toPropagate)
})
//  (isJust(fm) || isNotFm(fm) ? Just($toPropagate) : fm))

export const switchTo = propagate

// TODO: test
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

// experimental

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
// see https://github.com/jperasmus/pipe-then

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
}, { fonadUpdater: 'addNote' })

export const addClientErrMsg = fCurry(($msg, $fm) => {
  if (isFault($fm)) $fm._clientMsg = extract($msg)
  return $fm
}, { fonadUpdater: 'addClientErrMsg' })

// refectlivy add error message to Fault
export const addErrCode = fCurry(($code, $fm) => {
  if (isFault($fm)) $fm._code = extract($code)
  return $fm
}, { fonadUpdater: 'addErrCode' })

// refectlivy add error message to Fault
export const addErrCodeIfNone = curry(($code, $fm) => {
  if (isFault($fm) && isEmptyOrNil($fm._code)) $fm._code = extract($code)
  return $fm
})

// conditional fonad operators

export const addNoteIf = curry(async ($conditions, $note, $fm) => {
  const shouldAddNote = await check($conditions, $fm)
  return (
    isFault(shouldAddNote) ? shouldAddNote :
    shouldAddNote ? addNote(extract($note)) :
    $fm
  )
})

export const addClientErrMsgIf = curry(async ($conditions, $msg, $fm) => {
  const shouldAddClientMsg = await check($conditions, $fm)
  return (
    isFault(shouldAddClientMsg) ? shouldAddClientMsg :
    shouldAddClientMsg ? addClientErrMsg($msg, $fm) :
    $fm
  )
})

export const addErrCodeIf = curry(async ($conditions, $code, $fm) => {
  const shouldAddErrorCodeMsg = await check($conditions, $fm)
  return (
    isFault(shouldAddErrorCodeMsg) ? shouldAddErrorCodeMsg :
    shouldAddErrorCodeMsg ? addErrCode($code, $fm) :
    $fm
  )
})

//*****************************************************************************
// Conditional Lists
//*****************************************************************************

// checkPredList
//   returns true if all preds pass, otherwise false
//   accomadates mixture of sycn and async functions in the list
export const checkPredList = curry(async ($predList, $fm) => {
  const predList = _extractList($predList)
  if (isPassthrough($fm)) return $fm
  if (noneAreFonadOperators(predList) && isNonJustFm($fm)) return $fm
  const results = await Promise.all(predList.map(
    async pred => {
      const predRes = await map(pred, $fm)
      return (
        isJust(predRes) ? !!extract(predRes) :
        isFault(predRes) ? predRes :
        isOk(predRes) ? true :
        isNothing(predRes) || isPassthrough(predRes) ? false :
        !!predRes // should never hit this
      )
    }
  ))
  const fault = find(isFault, results)
  return fault || !any(isFalsy, results)
})

// check
//   evalute a condition list
//   $conditions can be an array of conditions, or a single condition
//   each condition can be a
//     * hard condition: evaluated for truthiness
//     * sync or async pred fn: evaluates pred(fm)
//   If 1 or more preds are included, a promise is returned in case any are asycn
//   All predsare  applied against the $fm
//   The $conditions can be any combination of the hard condition, sync pred, and asycn pred
//   If any of the preds throws/rejects/faults, returns fauls, and logs a wrning
export const check = async ($conditions, fm) => {
  // const fmResolved = await fm
  // TODO: find out why this fails
  //  const fmResolved = await fonadify($fm)

  const conditions = _extractList($conditions)
  const hardConditions = (await Promise.all(
    conditions.filter(isNotFunction)
  )).map(extract)
  const preds = conditions.filter(isFunction)
  const hardPass = isNilOrEmpty(hardConditions) || !any(isFalsy, hardConditions)
  const predPass =  isNilOrEmpty(preds) || await checkPredList(preds, fm)
  return isFault(predPass) ? predPass : (hardPass && predPass)
}

//*****************************************************************************
// Flow control functions
//*****************************************************************************

// TODO: these bear additional scrutiny

// callIf
//   if $conditions are satisfied, call fn/fns in $fnOrFnList applied to $fm
//   If any of the function calls returns a Fault, that fault is returned
//   truthy | pred() | [ truthy &/or preds] -> $fm -> $fm | F
export const callIf = curry(async ($conditions, $fnOrFnList, $fm) => {
  if(any(isPromise, [$conditions, $fnOrFnList, $fm]))
    return callIf(await $conditions, await $fnOrFnList, await $fm)
  if (isPassthrough($fm)) return $fm
  if (noneAreFonadOperators(_extractList($conditions)) && isNonJustFm($fm)) return $fm
  const shouldCall = await check($conditions, $fm)
  return (
    isFault(shouldCall) ? shouldCall :
    shouldCall ? call($fnOrFnList, $fm) :
    $fm
  )
})

// TODO: experimental, completely untested
export const mapIf = curry(async ($conditions, $fn, $fm) => {
  if(any(isPromise, [$conditions, $fn, $fm]))
    return mapIf(await $conditions, await $fn, await $fm)
  if (isPassthrough($fm)) return $fm
  if (noneAreFonadOperators(_extractList($conditions)) && isNonJustFm($fm)) return $fm
  const shouldMap = await check($conditions, $fm)
  return (
    isFault(shouldMap) ? shouldMap :
    shouldMap ? map($fn, $fm) :
    $fm
  )
})

// TODO: experimental, completely untested
export const propagateIf = curry(async ($conditions, $toPropagate, $fm) => {
  if (any(isPromise, [$conditions, $toPropagate, $fm]))
    return propagateIf(await $conditions, await $toPropagate, await $fm)
  const shouldPropagate = await check($conditions, $fm)
  const toReturn =
    isFault(shouldPropagate) ? shouldPropagate :
    shouldPropagate ? propagate($toPropagate, $fm) :
    $fm
  return toReturn
})

//export const propagate = curry(($toPropagate, fm) => {

// callMethodIf (FOP | NJR)
//   TODO: doc & test
//  ifIsFunc($conditions) calls method if $conditions($fm) is true
//  ifIsNotFunc(condnOrPred) calls method if condnOrPred itself is true
export const callMethodIf = curry(async ($conditions, $method, $args, $fm) => {
  if(any(isPromise, [ $conditions, $method, $args, $fm ]))
    return callMethodIf(await $conditions, await $method, await $args, await $fm)
  if (isPassthrough($fm)) return $fm
  if (noneAreFonadOperators(_extractList($conditions)) && isNonJustFm($fm)) return $fm
  const shouldCall = await check($conditions, $fm)
  return (
    isFault(shouldCall) ? shouldCall :
    shouldCall ? callMethod($method, $args, $fm) :
    $fm
  )
})

export const callOnFault = curry(($fnOrFnList, maybeFault) => {
  if (isPromise(maybeFault))
    return maybeFault.then(maybeFaultResolved => callOnFault($fnOrFnList, maybeFaultResolved))
  if (isNotFault(maybeFault)) return maybeFault
  const fnList = _extractList($fnOrFnList)                // since we are dealing with a fault
  const allFonadOperators = all(isFonadOperator, fnList)  // all fns must be fonadic operators
  return allFonadOperators ?
    _call(fnList, maybeFault) :
    Fault({op: 'callOnFault()', msg: 'all fns in fnList must be fonad operators'}) // ?????
})

// will handle async preds
export const passthroughIf = curry(async ($conditions, $fm) => {
  if (any(isPromise, [$conditions, $fm]))
    return passthroughIf(await $conditions, await $fm)
  const shouldPassThrough = await check($conditions, $fm)
  const toReturn =
    isFault(shouldPassThrough) ? shouldPassThrough :
    shouldPassThrough ? Passthrough($fm) :
    $fm
  return toReturn
})

export const returnIf = passthroughIf

// TODO: not extracting at all for fm ... so that fns that should and do return an fm do so correctly
// BUT think about this
// Should this reflect on NJFM and no fonad operators ... think about this carefuuly !!!!!
export const returnValIf = curry(async ($conditions, valOrfn, fm) => {
  if (any(isPromise, [ $conditions, valOrfn, fm ]))
    return returnValIf(await $conditions, await valOrfn, await fm)
  if (isFault(fm)) { // think this through carefully
    if (isNotFunction(valOrfn)) return fm
    if (isNotFonadOperator(valOrfn)) return fm
  }
  const shouldPassthroughVal = await check($conditions, fm)
  if (isFault(shouldPassthroughVal)) return shouldPassthroughVal
  if (shouldPassthroughVal) {
    const val = isFunction(valOrfn) ? await valOrfn(fm) : valOrfn
    return Passthrough(fonadify(val))
  }
  return fm
})


//   const shouldPassThrough = await check($conditions, $fm)

//   const fm = extract($fm)
//   const valOrfn = extract($valOrfn)
//   const val = isFunction(valOrfn) ? await valOrfn(fm) : valOrfn
// })


// // TODO: doc and test ... toReturn can be val or fn !!!!!!, then can deprecate returnActionIf
// export const returnValIf = curry(async ($conditions, toReturn, $fm) => {
//   const shouldPassThrough = await check($conditions, $fm)
//   return (
//     isFault(shouldPassThrough) ? shouldPassThrough :
//     shouldPassThrough ? Passthrough(toReturn) :
//     $fm
//   )
// })

// export const returnActionIf = curry(async ($conditions, $fn, $fm) => {
//   if (any(isPromise, [$conditions, $fn, $fm]))
//     return returnActionIf(await $conditions, await $fn, await $fm)

//   if (isPromise($fn)) return returnActionIf($conditions, await $fn, $fm)
//   // console.log('$fn: ', $fn)
//   const toReturn = await $fn($fm)
//   // console.log('toReturn: ', toReturn)
//   const shouldPassThrough = await check($conditions, $fm)
//   return (
//     isFault(shouldPassThrough) ? shouldPassThrough :
//     shouldPassThrough ? Passthrough(toReturn) :
//     $fm
//   )
// })


// TODO: test, look over, not solid on this ones
// Will transfer any notes from an incoming FM
export const faultIf = curry(async ($conditions, faultOptions, $fm) => {
  if (any(isPromise, [ $conditions, faultOptions, $fm ]))
    return faultIf(await $conditions, await faultOptions, await $fm)
  const shouldFault = await check($conditions, $fm)
  if (isFault(shouldFault)) return shouldFault
  if (shouldFault) {
    const fault = Fault(faultOptions)
    if ( isFm($fm) && $fm._notes.length) fault._setNotes($fm._notes)
    return fault
  }
  return $fm
})

// In progress, mauy not need
// export const fIf = curry(async ($conditions, $actions, $fm) => {
//   if (any(isPromise, [ $conditions, $actions, $fm ]))
//     return fIf(await $conditions, await $actions, await $fm)

// })

// case of [
//   [ conditions, actions ],
//   [ conditions, actions ],
//   [ conditions, actions ]
// ]
export const caseOf = curry(async (predActionList, $fm) => {
  if (any(isPromise, [ predActionList, $fm ]))
    return caseOf(await predActionList, await $fm)
  for (let i = 0; i < predActionList.length; i++) {
    const conditions = predActionList[i][0]
    const actions = flatArrayify(predActionList[i][1])
    const shouldExecute = await check(conditions, $fm)
    if (isFault(shouldExecute)) return shouldExecute
    if (shouldExecute) return pipeAsync(...actions)($fm)
  }
  return $fm;
})

// Use with CaseOf as a fallback predicate action
export const orElse = () => true

//*****************************************************************************
// Operate on monadic data
//*****************************************************************************

// TODO: tests need to be written
// TODO: need to check for incoming promises
// TODO: need to reflect when appropriate

export const fIsArray = $fm => isArray(extract($fm))

export const fEq = curry(($val, $fm) => extract($val) === extract($fm))
export const fProp = curry(($propName, $fm) => prop(extract($propName), extract($fm)))

export const fIsTrue = $fm =>
  isNonJustFm($fm) ? $fm : extract($fm) === true

export const fIsFalse = $fm =>
  isNonJustFm($fm) ? $fm : extract($fm) === false


export const fIncludes = curry(($val, $fmList) => {
  if (isNonJustFm($fmList)) return $fmList
  const fault = find(isFault, _extractList($fmList)) // ??
  return fault || Just(fIsArray($fmList) && includes(extract($val), extract($fmList)))
})


// TODO: can I consolidate on the ifXXX witha common base fn that checks for promises
// then a for nonJustFm, then applied fn passed in?
export const fIsTruthy = $fm => {
  if (isPromise($fm)) return $fm.then(fmResolved => fIsTruthy(fmResolved))
  if (isNonJustFm($fm)) return $fm
  return isTruthy(extract($fm))
}

export const fIsFalsey = $fm => {
  if (isPromise($fm)) return $fm.then(fmResolved => fIsFalsey(fmResolved))
  if (isNonJustFm($fm)) return $fm
  return isFalsy(extract($fm))
}


// TODO: would be nice to figure this out, how do you handle
// currying and variabl number of args?
// export const fComplement



//*****************************************************************************
// Logging and messaging
//*****************************************************************************

// return a status message
export const statusMsg = fm => (isFm(fm) ? fm._statusMsg() : `WARNING: can't get status for non-fm: ${json(fm)}`)

// return exception message if Fault with exception, otherwise '' (for testing)
export const getExceptionMsg = fault =>
  isFault(fault) && fault._e && fault._e.message ? fault._e.message : ''

// return cilent error message, otherwise '' (for testing)
export const getClientErrMsgMsg = fault => isFault(fault) ? fault._clientMsg : ''

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

export const logMsgIf = curry(async ($conditions, $msg, $fm) => {
  const shouldLog = await check($conditions, $fm)
  return (
    isFault(shouldLog) ? shouldLog :
    shouldLog ? logMsg(extract($msg), $fm) :
    $fm
  )
})

// log (PT)
//   Log and return fmOrVal.
//   if isFm(fmOrVal) logs fmOrVal._inspect
//   fm -> fm
export const log = fmOrVal => {
  if (isFm(fmOrVal)) console.log(inspect(fmOrVal))
  else console.log('Non FM:', fmOrVal)
  return fmOrVal
}

export const logIf = curry(async ($conditions, $fm) => {
  const shouldLog = await check($conditions, $fm)
  return (
    isFault(shouldLog) ? shouldLog :
    shouldLog ? log($fm) :
    $fm
  )
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

export const logType = $fm => {
  console.log(isFm($fm) ? $fm._type : 'Non FM' )
  return $fm
}

export const logTypeWithMsg = curry(($msg, $fm) => {
  console.log(extract($msg))
  return logType($fm)
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
export { pipeAsync, composeAsync, reflect, here, h, fCurry }

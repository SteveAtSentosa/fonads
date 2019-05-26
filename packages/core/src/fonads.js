// TODO
// * convert Fault to single instead of multiple
// * For any fns that create a fault, transfer notes from incoming fm to fault?? Could be tough
// * When faults generated w/in fonad utils, report module/line of caller (require allow here() to be bassed in)
// * allow loggers to be passed in for logging?
// * make call stack an array
// * get statsMsg vs. inspect solid, and use consitently in these utils

// import * as R from 'ramda';
// import * as RA from 'ramda-adjunct';
// import { logger, throwIf, terminate } from '../error/error';
// import { hasKeys } from '../../utils/fp';
// import LG from 'ramda-lens-groups';

import {
  all,
  curry,
  propEq,
  complement,
  isNil,
  drop,
  pipe,
  keys,
  filter,
  anyPass,
} from 'ramda'
import { isObject, isNotFunction, isString, isNotObject } from 'ramda-adjunct'
import { propIsFn, flatArrify } from './utils/types'
import { isError, throwIf, here } from './utils/error'
import { pipeAsync, composeAsync, reflect } from './utils/fn'

import Just from './Just'
import Nothing from './Nothing'
import Ok from './Ok'
import Fault from './Fault'

/*
These have concrete implementations

|              | Just               | Nothing       | Fault       | Ok          |
|-------------:|--------------------|---------------|-------------|-------------|
| abbrev       | J                  | N             | F           | O           |
| map          | f->J[a]->J[f(a)]   | -> self       | -> self     | -> self     |
| chain        | f->J[a]->f(a)      | -> self       | -> self     | -> self     |
| ap           | TBD                | -> self       | -> self     | -> self     |
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

Functional Monad

* abbreviation: M / fm
* M = V | S

Other abbreviaions
* a = any value of any type

*/

//*****************************************************************************
// Monadic type checkers
//*****************************************************************************

// May not need
// const hasMap = propIsFn('_map')
// const hasChain = propIsFn('_chain')
// const hasAp = propIsFn('_ap')
// const hasExtract = propIsFn('_extract')
const hasStatusMsg = propIsFn('_statusMsg')
const hasInspect = propIsFn('_ap')
// const hasType = propIsFn('_type')

// a -> bool
export const isFm = maybeFm => isObject(maybeFm) && propEq('_tag', '@@FMonad', maybeFm)
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
export const isValue = fm => isJust(fm) || isFault(fm) || isNothing(fm)
export const isNotValue = complement(isValue)

// fm -> bool
export const isStatus = fm => isOk(fm) || isFault(fm)
export const isNotStatus = complement(isStatus)

// fm -> bool
// TODO: same is isJust ?? If so depcreate and switch callers to isJust
export const isNonJustFm = fm => isFm(fm) && isNotJust(fm)

//*****************************************************************************
// Relaxed Monadic Interface
//*****************************************************************************

// chain (relaxed)
//   Can accept either a monad, or a raw value to be chained thorugh `fn`
//   If isFm(maybeFm) where maybeFm(v), returns result of calling fn(v)
//   If isNotFm(maybeFm), returns result of calling fn(maybeFm)
//   If an exception is thrown as a result of calling fn, a Fault is returned
//   (a->b) -> J[a] | a -> b | F
export const chain = curry((fn, maybeFm) => {
  const op = 'chain()'
  try {
    return isFm(maybeFm) ? maybeFm._chain(fn) : fn(maybeFm)
  } catch (e) {
    return Fault(op, 'Exception thrown by chain function', e)
  }
})

// map (relaxed)
// Can accept either a monad, or a raw value to be mapped thorugh `fn`
//   If isFm(maybeFm) where maybeFm<T>(v), result of fn(v) is returned monad of type T
//   If isNotFm(maybeFm), return Just(fn(maybeFm))
//   If an exception is thrown as a result of calling fn, a Fault is returned
//   (a->b) -> J[a] | a -> J[b] | F
export const map = curry((fn, maybeFm) => {
  const op = 'map()'
  try {
    return isFm(maybeFm) ? maybeFm._map(fn) : Just(fn(maybeFm))
  } catch (e) {
    return Fault(op, 'Exception thrown by map function', e)
  }
})

//*****************************************************************************
// Extended Monadic Interface
//*****************************************************************************

// Returns { shouldReturn: bool, toReturn: a }
const _checkMapMethodArgs = (op, method, args, maybeFm) => {
  const r = (shouldReturn, toReturn) => ({ shouldReturn, toReturn })
  if (isNonJustFm(maybeFm)) return r(true, maybeFm)
  const o = value(maybeFm)
  if (isNotObject(o)) return r(true, Fault(op, `Non object supplied: ${maybeFm}`))
  if (isNotFunction(o[method]))
    return r(true, Fault(op, `Method ${method} does not exist on object: ${maybeFm}`))
  return r(false, 'args are good')
}

// map over a class method | RLX, NJR
// For cases when a, of Just(a) is a class
//   if isJust(maybeFm), for fm[a] calls a.method() and returns the result b in J[b]
//   if isFm(a) and isNotJust(a), reflects fm
//   if isNotFm(fm), calls fm.method() and and returns the result b in J[b]
//   If an exception is thrown as a result of a.method(), a Fault is returned
//   'fn-name' -> [ arg1, arg2, ...] | singleArg -> J[a] | a -> J[b] | F
export const mapMethod = curry((method, args, maybeFm) => {
  const op = 'mapMethod()'
  const { shouldReturn, toReturn } = _checkMapMethodArgs(op, method, args, maybeFm)
  if (shouldReturn) return toReturn
  const o = value(maybeFm)
  try {
    return Just(o[method](...flatArrify(args)))
  } catch (e) {
    return Fault(op, `Exception thrown by map method '${method}'`, e)
  }
})

// map method, and if succeful pass through maybeMF
// TODO: better docs needed
export const mapMethodPT = curry((method, args, maybeFm) => {
  const result = mapMethod(method, args, maybeFm)
  return isFault(result) ? result : maybeFm
})

export const mapMethodIfConditionPT = curry((condition, method, args, maybeFm) =>
  condition ? mapMethodPT(method, args, maybeFm) : maybeFm,
)

// map over an asynchronous class method | RLX, NJR
// Same as mapMethod, but for async methods.
// Never rejects, always returns promise that will resolve with same values as mapMethod
const mapAsyncMethodNC = async (method, args, maybeFm) => {
  const op = 'mapAsyncMethod()'
  const { shouldReturn, toReturn } = _checkMapMethodArgs(op, method, args, maybeFm)
  if (shouldReturn) return toReturn
  const o = value(maybeFm)
  try {
    return Just(await o[method](...flatArrify(args)))
  } catch (e) {
    return Fault(op, `Exception thrown by async map method '${method}'`, e)
  }
}

// TODO: smarter way to do the currying?
// curried version
export const mapAsyncMethod = curry((method, args, maybeFm) =>
  mapAsyncMethodNC(method, args, maybeFm),
)


// map asycn method, and if succeful pass through maybeMF
// TODO: better docs needed
export const mapAsyncMethodPT = curry((method, args, maybeFm) =>
  pipeAsync(
    mapAsyncMethod(method, args),
    switchToOnNonFault(Just(maybeFm))
  )(maybeFm)
)

// for any fn that takes an single arg $fm and that returns an FM, call that fn supplying maybeFM.  If that
// fn returns a fault, returns the fault, otherwise reflects maybeFm
// () => [] => $fm
// TODO: make parallael pt that is not asynch ... rename pta ?
export const ptAsycn = curry(async (fn, maybeFm ) => {
  const res = await fn(maybeFm)
  return isFault(res) ? res : Just(maybeFm)
})


// Return value
//   For isJust(maybeFm[a]) or a,  return a
//   for isNonJustFm(fm) or isNil(maybeFm), return null
//   J[a] | a -> a | null
export const value = maybeFm => {
  if (isNil(maybeFm) || isNonJustFm(maybeFm)) return null
  if (isJust(maybeFm)) return maybeFm._val
  return maybeFm
}

// return a status message if the monad has one
export const statusMsg = fm =>
  hasStatusMsg(fm) ? fm._statusMsg() : 'no status available'

export const inspect = fm =>
  hasInspect(fm) ? fm._inspect() : `cant inspect non-monad: ${fm}`

export const logFm = fm => {
  if (isFm(fm)) console.log(inspect(fm))
  else console.log('Non FM:', fm)
  return fm
}

export const logMsg = curry((msg, fm) => {
  console.log(msg)
  return fm
})

export const logMsgOnNonFault = curry((msg, fm) => {
  if (isNotFault(fm)) console.log(msg)
  return fm
})

export const logFmWithMsg = curry((msg, fm) => {
  console.log(msg)
  return logFm(fm)
})

export const logValWithMsg = curry((msg, val, fm) => {
  console.log(msg)
  console.log(val)
  return fm
})

export const log = fm => {
  console.log(fm)
  return fm
}

//*****************************************************************************
// Monadic helpers
//*****************************************************************************

export const monadify = a =>
  isFm(a) ? a : isNil(a) ? Nothing() : isError(a) ? Fault('', '', a) : Just(a)

export const ifNotFault = curry((action, fm) => {
  if (isNotFault(fm)) action(fm)
  return fm
})

// Recieves fm and a predicated action list: [ [p1,a1a,a1b,...], [p2,a2a,a2b,...], ... ]
//   predActions[0] = predicate.  Will be mapped over fm as fm -> bool.  Example predicates: isJust, isOk, isFault, isNil, etc.
//   predActions[1..n] = list of fxns to pipe together, with fm as input, if predActions[0] evalues to true
//     pipe(predActions[1], predActions[2], ...)(fm).
// For the first predicate that evalutes to true, predActions[1..n] are piped together and the result is returned
// You can use orElse as a predicate for the last entry in the list to define default behaviour
// If none of the predicates evalute to true, an exception is thrown if `exceptionOnNoMatch`, otherwise fm is returned
// bool -> [ [p1,a1], [p2,a2], ... ] -> fm -> F | a
const _caseOf = (exceptionOnNoMatch, predActions, fm) => {
  for (let i = 0; i < predActions.length; i++) {
    const pred = predActions[i][0]
    const actionList = drop(1, predActions[i])
    if (pred(fm)) {
      return pipe(...actionList)(fm)
    }
  }
  throwIf(exceptionOnNoMatch, `caseOf() did not find match for monad: ${fm}`)
  return fm
}
export const caseOf = curry((predActions, fm) => _caseOf(true, predActions, fm)) // throws exception upon no match
export const caseOfLoose = curry((predActions, fm) => _caseOf(false, predActions, fm)) // returns fm upon no match

// // Use with CaseOf as a fallback predicate action
export const orElse = () => true

// Given a class and a single constructor arg, or an array of multiple
// constructor args, return corresponding instantiated class wrapped in Just
// If an exception is thorwn by the constructor, F is returned
// className is used for error logging only
// 'className' -> class -> args | [args] -> {class} | F
// TODO: supprt args that are wrapped in Just()?
// TODO: check for any args that are Fault() ?
export const instantiate = curry((classNameNote, Class, args) => {
  const op = 'instantiating class'
  try {
    return Just(new Class(...flatArrify(args)))
  } catch (e) {
    return Fault(op, `Exception thrown durinc constrcution of class ${classNameNote}`, e)
  }
})

export const propagateOnJust = curry((val, fm) => (isNonJustFm(fm) ? fm : val))
export const switchToOnJust = propagateOnJust
export const switchTo = curry((val, _) => val)


export const switchToOnNonFault = curry((val, fm) => (isFault(fm) ? fm : val))


const hereStr = here =>
  here ? ` -> ${here.file} | line ${here.line} | ${here.fn}()` : ''

// Add note to FM
export const addNote = curry((note, here, fm) => {
  fm._appendNote(`${note}${hereStr(here)}`)
  return fm
})

// Add note to Fault
export const addNoteIfFault = curry((note, here, fm) =>
  isFault(fm) ? addNote(note, here, fm) : fm,
)

// Set Fault root cause
export const setRootCauseIfFault = curry((rootCause, here, fm) => {
  if (!isFault(fm) || !isString(rootCause)) return fm
  // if a root cause has already been established, convert this to a note
  if (fm._rootCause) {
    addNote(rootCause, here, fm)
  } else {
    fm._setRootCause(`${rootCause}${hereStr(here)}`)
  }
  return fm
})

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

export const capture = curry((captureHere, fm) => {
  isJust(fm) && convertToJust(fm._val, captureHere)
  return fm
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
// export const isFm = maybeFm => R.prop("_tag",maybeFm) === '@@FMonad';

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

export { Just, Nothing, Ok, Fault }
export { pipeAsync, composeAsync, reflect, here }

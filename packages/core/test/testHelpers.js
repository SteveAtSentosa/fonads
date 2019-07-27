import { curry, equals, lt, gt } from 'ramda'
import { isTrue, isFalse } from 'ramda-adjunct'
import { Just, Ok, Fault, Nothing, Passthrough, fCurry, isJust, isNotJust } from '../src/fonads'
import { addNote, extract } from '../src/fonads'

export const testOk = Ok()
export const testNothing = Nothing()
export const testFault = Fault({ msg: 'test fault' })
export const testJust = Just(99)
export const testRaw = 'raw'
export const testPassthrough = Passthrough(testJust)

export const testOkPromise = Promise.resolve(testOk)
export const testNothingPromise = Promise.resolve(testNothing)
export const testFaultPromise = Promise.resolve(testFault)
export const testJustPromise = Promise.resolve(testJust)
export const testRawPromise = Promise.resolve(testRaw)
export const testPassthroughPromise = Promise.resolve(testPassthrough)

// experimental
export const returnsFault = fCurry(() => testFault, { fonadUpdater: 'returnsFault' })
export const returnsJust = fCurry(() => testJust, { fonadUpdater: 'returnsJust' })
export const returnsOk = fCurry(() => testOk, { fonadUpdater: 'returnsOk' })
export const returnsNothing = fCurry(() => testNothing, { fonadUpdater: 'returnsNothing' })
export const returnsPassthrough = fCurry(() => testPassthrough, { fonadUpdater: 'returnsPassthrough' })

export const returnsFaultAsync = fCurry(() => asyncResolve(testFault), { fonadUpdater: 'returnsFaultAsync' })
export const returnsJustAsync = fCurry(() => asyncResolve(testJust), { fonadUpdater: 'returnsJustAsync' })
export const returnsOkAsync = fCurry(() => asyncResolve(testOk), { fonadUpdater: 'returnsNothingAsync' })
export const returnsNothingAsync = fCurry(() => asyncResolve(testNothing), { fonadUpdater: 'returnsNothingAsync' })
export const returnsPassthroughAsync = fCurry(() => asyncResolve(testPassthrough), { fonadUpdater: 'returnsPassthroughAsync' })

export const allGood = () => 'all good'
export const throws = fCurry(() => { throw new Error('thrown') }, { fonadUpdater: 'throws' })

export const doit = true
export const bail = false

export const truePromise = Promise.resolve(true)
export const justTruePromise = Promise.resolve(Just(true))
export const falsePromise = Promise.resolve(false)
export const justFalsePromise = Promise.resolve(Just(false))

export const double = v => 2*v
export const triple = v => 3*v
export const quad = v => 4*v
export const square = v => v*v

export const fDouble = v => Just(2*extract(v))
export const fTriple = v => Just(3*extract(v))
export const fQuad = v => Just(4*extract(v))
export const fSquare = v => Just(extract(v)*extract(v))

export const fDoubleAsync = v => asyncResolve(Just(2*extract(v)))
export const fTripleAsync = v => asyncResolve(Just(3*extract(v)))
export const fQuadAsync = v => asyncResolve(Just(4*extract(v)))
export const fSquareAsync = v => asyncResolve(Just(extract(v)*extract(v)))


let _me = 'uninitialized'
export const getMe = () => _me
export const clearMe = () => (_me = null)
export const setMe = v => (_me = v)
export const doubleMe = () => (_me = double(_me))
export const tripleMe = () => (_me = triple(_me))
export const quadMe = () => (_me = quad(_me))
export const squareMe = () => (_me = square(_me))

export const asyncSetMe = async v => (_me = await asyncResolve(v))
export const asyncDoubleMe = async () => (_me = await asyncDouble(_me))
export const asyncTripleeMe = async () => (_me = await asyncTriple(_me))
export const asyncQuadMe = async () => (_me = await asyncQuad(_me))
export const asyncSquareMe = async () => (_me = await asyncSquare(_me))

export const asyncDouble = v => asyncResolve(2*v)
export const asyncTriple = v => asyncResolve(3*v)
export const asyncQuad = v => asyncResolve(4*v)
export const asyncSquare = v => asyncResolve(v*v)
export const asyncAddNote = fCurry((note, fm) => asyncResolve(addNote(note, fm)), { fonadUpdater: 'asyncAddNote' })

export const returnsTrue = () => true
export const returnsFalse = () => false
export const returnsTrueAsync = () => asyncResolve(true)
export const returnsFalseAsync = () => asyncResolve(false)

export const returnsTruePromise = () => Promise.resolve(true)
export const returnsFalsePromise = () => Promise.resolve(false)

export const returnsJustTrue = () => Just(true)
export const returnsJustFalse = () => Just(false)
export const returnsJustTrueAsync = () => asyncResolve(Just(true))
export const returnsJustFalseAsync = () => asyncResolve(Just(false))

export const asyncEq = curry((a, b) => asyncResolve(equals(a,b)))
export const asyncLt = curry((a, b) => asyncResolve(lt(a,b)))
export const asyncGt = curry((a, b) => asyncResolve(gt(a,b)))

export const isTrueAsync = v => asyncResolve(isTrue(v))
export const isFalseAsync = v => asyncResolve(isFalse(v))

export const asyncIsJust = fCurry(fm => asyncResolve(isJust(fm)), { fonadQuery: 'asyncIsJust' })
export const asyncIsNotJust = fCurry(fm => asyncResolve(isNotJust(fm)), { fonadQuery: 'asyncIsNotJust' })

// export const asyncIsJust = fm => asyncResolve(isJust(fm))
// asyncIsJust.isFonadOperator = true // (faking this for testing)
// export const asyncIsNotJust = fm => asyncResolve(isNotJust(fm))
// asyncIsNotJust.isFonadOperator = true // (faking this for testing)

// respolved with v
export const asyncResolve = v =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      resolve(v)
    }, 5),
  )

// resolves with testFault
export const asyncFault = () => asyncResolve(testFault)

// rejects with 'rejected'
export const asyncReject = a =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      reject(new Error('rejected'))
    }, 10),
  )

asyncReject.fonadQuery = 'asyncReject' // TODO: hack until I figure out the below
// why is this not working?
// export const asyncReject = fCurry(a =>
//   new Promise((resolve, reject) =>
//     setTimeout(() => {
//       reject(new Error('rejected'))
//     }, 10),
//   ))


export const timeout = () =>
  new Promise(resolve => {
    setTimeout(resolve, 5)
  })

// throws 'thrown'
export const asyncThrow = fCurry(async (ms = 5)  => {
  await timeout(ms)
  throw new Error('thrown')
}, { fonadQuery: 'asyncThrow' })

export class Async {
  resolve(msg) {
    return new Promise((resolve, reject) => setTimeout(() => resolve(msg), 10))
  }
  reject(msg) {
    return new Promise((resolve, reject) => setTimeout(() => reject(new Error(msg)), 10))
  }
  throw(msg) {
    throw new Error(msg)
  }
  fault() {
    return testFault
  }
}

export class Add {
  constructor() { this.val = 0 }
  three(v1, v2, v3) { this.val = v1 + v2 + v3; return this.val }
  setVal(v) {this.val += v; return this.val }
  getVal() { return this.val }
  reset() { this.val = 0; return this.val }
  throw() { throw new Error('thrown') }
  fault() { return testFault }
}

export class AddAsync {
  constructor() { this.val = 0 }
  three(v1, v2, v3) { this.val = v1 + v2 + v3; return asyncResolve(this.val) }
  setVal(v) {this.val += v; return asyncResolve(this.val) }
  getVal() { return asyncResolve(this.val) }
  reset() { this.val = 0; return asyncResolve(this.val) }
  throw() { asyncThrow() }
  fault() { return asyncFault() }
  reject() { return asyncReject() }
}

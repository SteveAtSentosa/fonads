import { Just, Ok, Fault, Nothing, Passthrough, isFault } from '../src/fonads'
import { doesNotReject } from 'assert';

export const testOk = Ok()
export const testNothing = Nothing()
export const testFault = Fault()
export const testJust = Just(99)
export const testRaw = 'raw'
export const testPassthrough = Passthrough(testJust)

export const allGood = () => 'all good'
export const returnsFault = () => testFault
export const throws = () => {
  throw new Error('thrown')
}

export const double = v => 2*v
export const triple = v => 3*v
export const quad = v => 4*v
export const square = v => v*v

export const asyncDouble = v => asyncResolve(2*v)
export const asyncTriple = v => asyncResolve(3*v)
export const asyncQuad = v => asyncResolve(4*v)
export const asyncSquare = v => asyncResolve(v*v)

// respolved with v
export const asyncResolve = v =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      resolve(v)
    }, 10),
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

export const timeout = () =>
  new Promise(resolve => {
    setTimeout(resolve, 5)
  })

// throws 'thrown'
export const asyncThrow = async ms => {
  await timeout(ms)
  throw new Error('thrown')
}

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
  three(v1, v2, v3) {
    return v1 + v2 + v3
  }
  throw() {
    throw new Error('thrown')
  }
  fault() {
    return testFault
  }
}

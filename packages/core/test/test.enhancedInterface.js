import { expect } from 'chai'
import { isPromise, isTruthy } from 'ramda-adjunct'
import { reflect } from '../src/utils/fn'

import { Ok, Just, Fault, Nothing, isJust, isFault } from '../src/fonads'
import { extract, map, mapMethod, call, fPromisify, exceptionMsg } from '../src/fonads'
import { callAsync, callMethod, callAsyncMethod } from '../src/fonads'

import {
  testOk, testNothing, testFault, testJust, testRaw,
  asyncResolve, asyncFault, asyncReject, asyncThrow, Add, Async, allGood, returnsFault, throws
} from './testHelpers'

export default function runEnhancedInterfaceTests() {
  describe('enhanced monadic interface tests', () => {
    testFonadicPromisify()
    testMapAsync()
    testMapMethod()
    testMapAsyncMethod()
    testCall()
    testCallasync()
    testCallMethod()
    testCallAsyncMethod()
    testCallFnLst()
    // TODO:testInstantiateClass()
  })
}



// const testOk = Ok()
// const testNothing = Nothing()
// const testFault = Fault()
// const testJust = Just(99)
// const testRaw = 'raw'


// // todo, put these in a common testing util file
// const asyncResolve = v =>
//   new Promise((resolve, reject) =>
//     setTimeout(() => {
//       resolve(v)
//     }, 10),
//   )

// const asyncFault = () => asyncResolve(testFault)

// const asyncReject = a =>
//   new Promise((resolve, reject) =>
//     setTimeout(() => {
//       reject(new Error('rejected'))
//     }, 10),
//   )

// const timeout = () =>
//   new Promise(resolve => {
//     setTimeout(resolve, 10)
//   })

// const asyncThrow = async ms => {
//   await timeout(ms)
//   throw new Error('thrown')
// }

// class Add {
//   three(v1, v2, v3) {
//     return v1 + v2 + v3
//   }
//   throw() {
//     throw new Error('barf')
//   }
//   fault() {
//     return testFault
//   }
// }

// class Async {
//   resolve(msg) {
//     return new Promise((resolve, reject) => setTimeout(() => resolve(msg), 10))
//   }
//   reject(msg) {
//     return new Promise((resolve, reject) => setTimeout(() => reject(new Error(msg)), 10))
//   }
//   throw(msg) {
//     throw new Error(msg)
//   }
//   fault() {
//     return testFault
//   }
// }

// const allGood = () => 'all good'
// const returnsFault = () => testFault
// const throws = () => {
//   throw new Error('thrown')
// }

const testFonadicPromisify = () => {
  it('should wait correctly', async () => {

    const resolvedPromise = asyncResolve('resolved')
    expect(isPromise(resolvedPromise)).to.equal(true)
    const resolved = await fPromisify(resolvedPromise)
    expect(isJust(resolved)).to.satisfy(isTruthy)
    expect(extract(resolved)).to.equal('resolved')

    const rejectedPromise = asyncReject()
    expect(isPromise(rejectedPromise)).to.equal(true)
    const rejected = await fPromisify(rejectedPromise)
    expect(isFault(rejected)).to.satisfy(isTruthy)
    expect(exceptionMsg(rejected)).to.equal('rejected')

    const thrownPromise = asyncThrow()
    expect(isPromise(thrownPromise)).to.equal(true)
    const thrown = await fPromisify(thrownPromise)
    expect(isFault(thrown)).to.satisfy(isTruthy)
    expect(exceptionMsg(thrown)).to.equal('thrown')
  })
}

const testMapAsync = () => {
  it('should map async functions correctly', async () => {
    // monadic inputs

    const resolved = await map(asyncResolve, testJust)
    expect(isJust(resolved)).to.satisfy(isTruthy)
    expect(extract(resolved)).to.equal(99)

    const rejected = await map(asyncReject, testJust)
    expect(isFault(rejected)).to.satisfy(isTruthy)

    const thrown = await map(asyncThrow, testJust)
    expect(isFault(thrown)).to.satisfy(isTruthy)

    // raw inputs

    const resolved2 = await map(asyncResolve, 88)
    expect(isJust(resolved2)).to.satisfy(isTruthy)
    expect(extract(resolved2)).to.equal(88)

    const rejected2 = await map(asyncReject, 88)
    expect(isFault(rejected2)).to.satisfy(isTruthy)

    const thrown2 = await map(asyncThrow, 88)
    expect(isFault(thrown2)).to.satisfy(isTruthy)

    // currying

    const curriedResolver = map(asyncResolve)
    const resolved3 = await curriedResolver(testJust)
    expect(extract(resolved3)).to.equal(99)

    const curriedRejector = map(asyncReject)
    const rejected3 = await curriedRejector(null)
    expect(isFault(rejected3)).to.satisfy(isTruthy)

    const curriedThrower = map(asyncThrow)
    const thrown3 = await curriedThrower([])
    expect(isFault(thrown3)).to.satisfy(isTruthy)

    // non just reflectivity

    const reflectedOk = await curriedResolver(testOk)
    expect(reflectedOk).to.equal(testOk)

    const reflectedNothing = await curriedResolver(testNothing)
    expect(reflectedNothing).to.equal(testNothing)

    const reflectedFault = await curriedResolver(testFault)
    expect(reflectedFault).to.equal(testFault)
  })
}

const testMapMethod = () => {
  it('should map methods correctly', () => {
    const rawAdd = new Add()
    const r1 = mapMethod('three', [1, 2, 3], rawAdd)
    expect(isJust(r1)).to.satisfy(isTruthy)
    expect(extract(r1)).to.equal(6)

    const justAdd = Just(rawAdd)
    const r2 = mapMethod('three', [4, 5, 6], justAdd)
    expect(isJust(r2)).to.satisfy(isTruthy)
    expect(extract(r2)).to.equal(15)

    expect(extract(mapMethod('reflect', ['me'], { reflect }))).to.equal('me')
    expect(extract(mapMethod('reflect', 'me', { reflect }))).to.equal('me')

    // check NJR
    expect(mapMethod('three', [1, 2, 3], testOk)).to.equal(testOk)
    expect(mapMethod('three', [1, 2, 3], testNothing)).to.equal(testNothing)
    expect(mapMethod('three', [1, 2, 3], testFault)).to.equal(testFault)

    // check error conditions
    expect(isFault(mapMethod('three', [1, 2, 3], {}))).to.satisfy(isTruthy)
    expect(isFault(mapMethod('three', [1, 2, 3], 'non-object'))).to.satisfy(isTruthy)
    expect(isFault(mapMethod('nomethod', [], justAdd))).to.satisfy(isTruthy)
    expect(isFault(mapMethod('nomethod', [], rawAdd))).to.satisfy(isTruthy)
    expect(isFault(mapMethod('nonFn', [], { nonFn: [] }))).to.satisfy(isTruthy)
    expect(isFault(mapMethod('nonFn', [], { nonFn: {} }))).to.satisfy(isTruthy)
    expect(isFault(mapMethod('throw', [], justAdd))).to.satisfy(isTruthy)
    expect(mapMethod('fault', [], justAdd)).to.equal(testFault)
  })
}

const testMapAsyncMethod = () => {
  it('should map async methods correctly', async () => {
    const rawAsync = new Async()
    const justAsync = Just(rawAsync)

    const resolved1 = await mapMethod('resolve', ['I am resolved'], rawAsync)
    expect(isJust(resolved1)).to.satisfy(isTruthy)
    expect(extract(resolved1)).to.equal('I am resolved')

    const resolved2 = await mapMethod('resolve', 'I am resolved too', justAsync)
    expect(isJust(resolved2)).to.satisfy(isTruthy)
    expect(extract(resolved2)).to.equal('I am resolved too')

    const rejected1 = await mapMethod('reject', ['I am rejected'], rawAsync)
    expect(isFault(rejected1)).to.satisfy(isTruthy)
    const rejected2 = await mapMethod('reject', ['I am rejected too'], justAsync)
    expect(isFault(rejected2)).to.satisfy(isTruthy)

    const thrown1 = await mapMethod('throw', ['I was thrown'], rawAsync)
    expect(isFault(thrown1)).to.satisfy(isTruthy)
    const thrown2 = await mapMethod('throw', ['I was thrown too'], justAsync)
    expect(isFault(thrown2)).to.satisfy(isTruthy)

    const fault1 = await mapMethod('fault', ['My fault'], rawAsync)
    expect(fault1).to.equal(testFault)
    const fault2 = await mapMethod('fault', ['My fault too'], justAsync)
    expect(fault2).to.equal(testFault)

    // test currying
    const mapGoBetween = mapMethod('resolve', ['I am fully resolved'])
    const curryResult = await mapGoBetween(justAsync)
    expect(isJust(curryResult)).to.satisfy(isTruthy)
    expect(extract(curryResult)).to.equal('I am fully resolved')

    // check error conditions
    expect(isFault(await mapMethod('resolve', [1, 2, 3], {}))).to.satisfy(isTruthy)
    expect(isFault(await mapMethod('resolve', [1, 2, 3], 'non-object'))).to.satisfy(isTruthy)
    expect(isFault(await mapMethod('nomethod', [], rawAsync))).to.satisfy(isTruthy)
    expect(isFault(await mapMethod('nomethod', [], justAsync))).to.satisfy(isTruthy)
    expect(isFault(await mapMethod('nonFn', [], { nonFn: [] }))).to.satisfy(isTruthy)
    expect(isFault(await mapMethod('nonFn', [], { nonFn: {} }))).to.satisfy(isTruthy)
  })
}

const testCall = () => {
  it('should FOP call functions correctly', () => {
    // test non error case
    expect(call(allGood, testJust)).to.equal(testJust)
    expect(isJust(call(allGood, testRaw))).to.equal(false) // no longer doing `auto`Fonadify, not sure what final decision will be
    expect(call(allGood, testRaw)).to.equal('raw')

    // test call returns Fault or throws
    expect(call(returnsFault, testJust)).to.equal(testFault)
    expect(isFault(call(throws, testJust))).to.satisfy(isTruthy)

    // test NJR
    expect(call(allGood, testFault)).to.equal(testFault)
    expect(call(allGood, testNothing)).to.equal(testNothing)
    expect(call(allGood, testOk)).to.equal(testOk)
  })
}

const testCallasync = () => {
  it('should FOP call async functions correctly', async () => {
    const resolved = await callAsync(asyncResolve, testJust)
    expect(resolved).to.equal(testJust)

    const rejected = await callAsync(asyncReject, testJust)
    expect(isFault(rejected)).to.satisfy(isTruthy)

    const thrown = await callAsync(asyncThrow, testJust)
    expect(isFault(thrown)).to.satisfy(isTruthy)

    const fault = await callAsync(asyncFault, testJust)
    expect(isFault(fault)).to.satisfy(isTruthy)

    // raw inputs

    const resolved2 = await callAsync(asyncResolve, 'any val')
    expect(isJust(resolved2)).to.equal(false) // no longer auto-fonadifying
    expect(resolved2).to.equal('any val')

    const rejected2 = await callAsync(asyncReject, 'any val')
    expect(isFault(rejected2)).to.satisfy(isTruthy)

    const thrown2 = await callAsync(asyncThrow, 'any val')
    expect(isFault(thrown2)).to.satisfy(isTruthy)

    const fault2 = await callAsync(asyncFault, 'any val')
    expect(isFault(fault2)).to.satisfy(isTruthy)

    // currying

    const curriedResolver = callAsync(asyncResolve)
    const resolved3 = await curriedResolver(testJust)
    expect(resolved3).to.equal(testJust)

    const curriedRejector = callAsync(asyncReject)
    const rejected3 = await curriedRejector(null)
    expect(isFault(rejected3)).to.satisfy(isTruthy)

    const curriedThrower = callAsync(asyncThrow)
    const thrown3 = await curriedThrower([])
    expect(isFault(thrown3)).to.satisfy(isTruthy)

    // non just reflectivity

    const reflectedOk = await curriedResolver(testOk)
    expect(reflectedOk).to.equal(testOk)

    const reflectedNothing = await curriedResolver(testNothing)
    expect(reflectedNothing).to.equal(testNothing)

    const reflectedFault = await curriedResolver(testFault)
    expect(reflectedFault).to.equal(testFault)
  })
}


const testCallFnLst = () => {
  it('should handle call of non-async fn lists correctly', () => {
    const fnList = [ allGood, allGood, allGood ]
    const res = call(fnList, testJust)
    // console.log('res: ', res)

    // const testJust = Just(99)
    // const testRaw = 'raw'

    // TODO: test faults returned
  })

  it('should handle total-async fn lists correctly', () => {

    // const fnList = [ asyncResolve, asyncResolve, asyncResolve ]
    // const res = call(fnList, testJust)


    // const fnList = [ allGood, allGood2, allGood3 ]
    // const resolved = await callAsync(asyncResolve, testJust)
    // expect(resolved).to.equal(testJust)

  })

  // it('should handle mixed-async fn lists correctly', () => {
  //   const fnList = [ allGood, asyncResolve, allGood ]
  //   const res = call(fnList, testJust)

  // })

  // const rawAdd = new Add()
  // const justAdd = Just(rawAdd)

  // const r1 = callMethod('three', [4, 5, 6], justAdd)
  // expect(r1).to.equal(justAdd)

  // const r2 = callMethod('three', [1, 2, 3], rawAdd)
  // expect(isJust(r2)).to.equal(true)
  // expect(extract(r2)).to.equal(rawAdd)

  // expect(extract(callMethod('reflect', ['me'], { reflect }))).to.deep.equal({ reflect })
  // expect(extract(callMethod('reflect', 'me', { reflect }))).to.deep.equal({ reflect })

  // // check NJR
  // expect(callMethod('three', [1, 2, 3], testOk)).to.equal(testOk)
  // expect(callMethod('three', [1, 2, 3], testNothing)).to.equal(testNothing)
  // expect(callMethod('three', [1, 2, 3], testFault)).to.equal(testFault)

  // // check error conditions
  // expect(isFault(callMethod('three', [1, 2, 3], {}))).to.equal(true)
  // expect(isFault(callMethod('three', [1, 2, 3], 'non-object'))).to.equal(true)
  // expect(isFault(callMethod('nomethod', [], justAdd))).to.equal(true)
  // expect(isFault(callMethod('nomethod', [], rawAdd))).to.equal(true)
  // expect(isFault(callMethod('nonFn', [], { nonFn: [] }))).to.equal(true)
  // expect(isFault(callMethod('nonFn', [], { nonFn: {} }))).to.equal(true)
  // expect(isFault(callMethod('throw', [], justAdd))).to.equal(true)
  // expect(isFault(callMethod('fault', [], justAdd))).to.equal(true)

}



const testCallMethod = () => {
  it('should FOP call methods correctly', () => {
    const rawAdd = new Add()
    const justAdd = Just(rawAdd)

    const r1 = callMethod('three', [4, 5, 6], justAdd)
    expect(r1).to.equal(justAdd)

    const r2 = callMethod('three', [1, 2, 3], rawAdd)
    expect(isJust(r2)).to.satisfy(isTruthy)
    expect(extract(r2)).to.equal(rawAdd)

    expect(extract(callMethod('reflect', ['me'], { reflect }))).to.deep.equal({ reflect })
    expect(extract(callMethod('reflect', 'me', { reflect }))).to.deep.equal({ reflect })

    // check NJR
    expect(callMethod('three', [1, 2, 3], testOk)).to.equal(testOk)
    expect(callMethod('three', [1, 2, 3], testNothing)).to.equal(testNothing)
    expect(callMethod('three', [1, 2, 3], testFault)).to.equal(testFault)

    // check error conditions
    expect(isFault(callMethod('three', [1, 2, 3], {}))).to.satisfy(isTruthy)
    expect(isFault(callMethod('three', [1, 2, 3], 'non-object'))).to.satisfy(isTruthy)
    expect(isFault(callMethod('nomethod', [], justAdd))).to.satisfy(isTruthy)
    expect(isFault(callMethod('nomethod', [], rawAdd))).to.satisfy(isTruthy)
    expect(isFault(callMethod('nonFn', [], { nonFn: [] }))).to.satisfy(isTruthy)
    expect(isFault(callMethod('nonFn', [], { nonFn: {} }))).to.satisfy(isTruthy)
    expect(isFault(callMethod('throw', [], justAdd))).to.satisfy(isTruthy)
    expect(isFault(callMethod('fault', [], justAdd))).to.satisfy(isTruthy)
  })
}

const testCallAsyncMethod = () => {
  it('should FOP call async methods correctly', async () => {
    const rawAsync = new Async()
    const justAsync = Just(rawAsync)

    const resolved1 = await callAsyncMethod('resolve', ['I am resolved'], rawAsync)
    expect(isJust(resolved1)).to.satisfy(isTruthy)
    expect(extract(resolved1)).to.equal(rawAsync)

    const resolved2 = await callAsyncMethod('resolve', 'I am resolved too', justAsync)
    expect(resolved2).to.equal(justAsync)

    const rejected1 = await callAsyncMethod('reject', ['I am rejected'], rawAsync)
    expect(isFault(rejected1)).to.satisfy(isTruthy)
    const rejected2 = await callAsyncMethod('reject', ['I am rejected too'], justAsync)
    expect(isFault(rejected2)).to.satisfy(isTruthy)

    const thrown1 = await callAsyncMethod('throw', ['I was thrown'], rawAsync)
    expect(isFault(thrown1)).to.satisfy(isTruthy)
    const thrown2 = await callAsyncMethod('throw', ['I was thrown too'], justAsync)
    expect(isFault(thrown2)).to.satisfy(isTruthy)

    const fault1 = await callAsyncMethod('fault', ['I was thrown'], rawAsync)
    expect(isFault(fault1)).to.satisfy(isTruthy)
    const fault2 = await callAsyncMethod('fault', ['I was thrown too'], justAsync)
    expect(isFault(fault2)).to.satisfy(isTruthy)

    // test currying
    const curriedAsyncMethod = callAsyncMethod('resolve', ['I am fully resolved'])
    const curryResult = await curriedAsyncMethod(justAsync)
    expect(isJust(curryResult)).to.satisfy(isTruthy)
    expect(curryResult).to.equal(justAsync)

    // check error conditions
    expect(isFault(await callAsyncMethod('resolve', [1, 2, 3], {}))).to.satisfy(isTruthy)
    expect(isFault(await callAsyncMethod('resolve', [1, 2, 3], 'non-object'))).to.satisfy(isTruthy)
    expect(isFault(await callAsyncMethod('nomethod', [], rawAsync))).to.satisfy(isTruthy)
    expect(isFault(await callAsyncMethod('nomethod', [], justAsync))).to.satisfy(isTruthy)
    expect(isFault(await callAsyncMethod('nonFn', [], { nonFn: [] }))).to.satisfy(isTruthy)
    expect(isFault(await callAsyncMethod('nonFn', [], { nonFn: {} }))).to.satisfy(isTruthy)
  })
}

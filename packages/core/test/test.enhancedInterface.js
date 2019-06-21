import { expect } from 'chai'
import { reflect } from '../src/utils/fn'

import { Ok, Just, Fault, Nothing, isJust, isFault } from '../src/fonads'
import { extract, mapAsync, mapMethod, mapAsyncMethod, call } from '../src/fonads'
import { callAsync, callMethod, callAsyncMethod } from '../src/fonads'

export default function runEnhancedInterfaceTests() {
  describe('enhanced monadic interface tests', () => {
    testMapAsync()
    testMapMethod()
    testMapAsyncMethod()
    testCall()
    testCallAsycn()
    testCallMethod()
    testCallAsyncMethod()
    // TODO:testInstantiateClass()
  })
}

const testOk = Ok()
const testNothing = Nothing()
const testFault = Fault()
const testJust = Just(99)
const testRaw = 'raw'

const asyncResolve = v =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      resolve(v)
    }, 10),
  )

const asycnFault = () => asyncResolve(testFault)

const asyncReject = a =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      reject(new Error('rejected'))
    }, 10),
  )

const timeout = () =>
  new Promise(resolve => {
    setTimeout(resolve, 10)
  })

const asyncThrow = async ms => {
  await timeout(ms)
  throw new Error('thrown')
}

class Add {
  three(v1, v2, v3) {
    return v1 + v2 + v3
  }
  throw() {
    throw new Error('barf')
  }
  fault() {
    return testFault
  }
}

class Async {
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

const testMapAsync = () => {
  it('should map asycn functions correctly', async () => {
    // monadic inputs

    const resolved = await mapAsync(asyncResolve, testJust)
    expect(isJust(resolved)).to.equal(true)
    expect(extract(resolved)).to.equal(99)

    const rejected = await mapAsync(asyncReject, testJust)
    expect(isFault(rejected)).to.equal(true)

    const thrown = await mapAsync(asyncThrow, testJust)
    expect(isFault(thrown)).to.equal(true)

    // raw inputs

    const resolved2 = await mapAsync(asyncResolve, 88)
    expect(isJust(resolved2)).to.equal(true)
    expect(extract(resolved2)).to.equal(88)

    const rejected2 = await mapAsync(asyncReject, 88)
    expect(isFault(rejected2)).to.equal(true)

    const thrown2 = await mapAsync(asyncThrow, 88)
    expect(isFault(thrown2)).to.equal(true)

    // currying

    const curriedResolver = mapAsync(asyncResolve)
    const resolved3 = await curriedResolver(testJust)
    expect(extract(resolved3)).to.equal(99)

    const curriedRejector = mapAsync(asyncReject)
    const rejected3 = await curriedRejector(null)
    expect(isFault(rejected3)).to.equal(true)

    const curriedThrower = mapAsync(asyncThrow)
    const thrown3 = await curriedThrower([])
    expect(isFault(thrown3)).to.equal(true)

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
    expect(isJust(r1)).to.equal(true)
    expect(extract(r1)).to.equal(6)

    const justAdd = Just(rawAdd)
    const r2 = mapMethod('three', [4, 5, 6], justAdd)
    expect(isJust(r2)).to.equal(true)
    expect(extract(r2)).to.equal(15)

    expect(extract(mapMethod('reflect', ['me'], { reflect }))).to.equal('me')
    expect(extract(mapMethod('reflect', 'me', { reflect }))).to.equal('me')

    // check NJR
    expect(mapMethod('three', [1, 2, 3], testOk)).to.equal(testOk)
    expect(mapMethod('three', [1, 2, 3], testNothing)).to.equal(testNothing)
    expect(mapMethod('three', [1, 2, 3], testFault)).to.equal(testFault)

    // check error conditions
    expect(isFault(mapMethod('three', [1, 2, 3], {}))).to.equal(true)
    expect(isFault(mapMethod('three', [1, 2, 3], 'non-object'))).to.equal(true)
    expect(isFault(mapMethod('nomethod', [], justAdd))).to.equal(true)
    expect(isFault(mapMethod('nomethod', [], rawAdd))).to.equal(true)
    expect(isFault(mapMethod('nonFn', [], { nonFn: [] }))).to.equal(true)
    expect(isFault(mapMethod('nonFn', [], { nonFn: {} }))).to.equal(true)
    expect(isFault(mapMethod('throw', [], justAdd))).to.equal(true)
    expect(mapMethod('fault', [], justAdd)).to.equal(testFault)
  })
}

const testMapAsyncMethod = () => {
  it('should map asycn methods correctly', async () => {
    const rawAsync = new Async()
    const justAsync = Just(rawAsync)

    const resolved1 = await mapAsyncMethod('resolve', ['I am resolved'], rawAsync)
    expect(isJust(resolved1)).to.equal(true)
    expect(extract(resolved1)).to.equal('I am resolved')

    const resolved2 = await mapAsyncMethod('resolve', 'I am resolved too', justAsync)
    expect(isJust(resolved2)).to.equal(true)
    expect(extract(resolved2)).to.equal('I am resolved too')

    const rejected1 = await mapAsyncMethod('reject', ['I am rejected'], rawAsync)
    expect(isFault(rejected1)).to.equal(true)
    const rejected2 = await mapAsyncMethod('reject', ['I am rejected too'], justAsync)
    expect(isFault(rejected2)).to.equal(true)

    const thrown1 = await mapAsyncMethod('throw', ['I was thrown'], rawAsync)
    expect(isFault(thrown1)).to.equal(true)
    const thrown2 = await mapAsyncMethod('throw', ['I was thrown too'], justAsync)
    expect(isFault(thrown2)).to.equal(true)

    const fault1 = await mapAsyncMethod('fault', ['My fault'], rawAsync)
    expect(fault1).to.equal(testFault)
    const fault2 = await mapAsyncMethod('fault', ['My fault too'], justAsync)
    expect(fault2).to.equal(testFault)

    // test currying
    const mapGoBetween = mapAsyncMethod('resolve', ['I am fully resolved'])
    const curryResult = await mapGoBetween(justAsync)
    expect(isJust(curryResult)).to.equal(true)
    expect(extract(curryResult)).to.equal('I am fully resolved')

    // check error conditions
    expect(isFault(await mapAsyncMethod('resolve', [1, 2, 3], {}))).to.equal(true)
    expect(isFault(await mapAsyncMethod('resolve', [1, 2, 3], 'non-object'))).to.equal(true)
    expect(isFault(await mapAsyncMethod('nomethod', [], rawAsync))).to.equal(true)
    expect(isFault(await mapAsyncMethod('nomethod', [], justAsync))).to.equal(true)
    expect(isFault(await mapAsyncMethod('nonFn', [], { nonFn: [] }))).to.equal(true)
    expect(isFault(await mapAsyncMethod('nonFn', [], { nonFn: {} }))).to.equal(true)
  })
}

const testCall = () => {
  it('should FOP call functions correctly', () => {
    const allGood = () => 'all good'
    const returnsFault = () => testFault
    const throws = () => {
      throw new Error('thrown')
    }

    // test non error case
    expect(call(allGood, testJust)).to.equal(testJust)
    expect(isJust(call(allGood, testRaw))).to.equal(true)
    expect(extract(call(allGood, testRaw))).to.equal('raw')

    // test call returns Fault or throws
    expect(call(returnsFault, testJust)).to.equal(testFault)
    expect(isFault(call(throws, testJust))).to.equal(true)

    // test NJR
    expect(call(allGood, testFault)).to.equal(testFault)
    expect(call(allGood, testNothing)).to.equal(testNothing)
    expect(call(allGood, testOk)).to.equal(testOk)
  })
}

const testCallAsycn = () => {
  it('should FOP call asycn functions correctly', async () => {
    const resolved = await callAsync(asyncResolve, testJust)
    expect(resolved).to.equal(testJust)

    const rejected = await callAsync(asyncReject, testJust)
    expect(isFault(rejected)).to.equal(true)

    const thrown = await callAsync(asyncThrow, testJust)
    expect(isFault(thrown)).to.equal(true)

    const fault = await callAsync(asycnFault, testJust)
    expect(isFault(fault)).to.equal(true)

    // raw inputs

    const resolved2 = await callAsync(asyncResolve, 'any val')
    expect(isJust(resolved2)).to.equal(true)
    expect(extract(resolved2)).to.equal('any val')

    const rejected2 = await callAsync(asyncReject, 'any val')
    expect(isFault(rejected2)).to.equal(true)

    const thrown2 = await callAsync(asyncThrow, 'any val')
    expect(isFault(thrown2)).to.equal(true)

    const fault2 = await callAsync(asycnFault, 'any val')
    expect(isFault(fault2)).to.equal(true)

    // currying

    const curriedResolver = callAsync(asyncResolve)
    const resolved3 = await curriedResolver(testJust)
    expect(resolved3).to.equal(testJust)

    const curriedRejector = callAsync(asyncReject)
    const rejected3 = await curriedRejector(null)
    expect(isFault(rejected3)).to.equal(true)

    const curriedThrower = callAsync(asyncThrow)
    const thrown3 = await curriedThrower([])
    expect(isFault(thrown3)).to.equal(true)

    // non just reflectivity

    const reflectedOk = await curriedResolver(testOk)
    expect(reflectedOk).to.equal(testOk)

    const reflectedNothing = await curriedResolver(testNothing)
    expect(reflectedNothing).to.equal(testNothing)

    const reflectedFault = await curriedResolver(testFault)
    expect(reflectedFault).to.equal(testFault)
  })
}

const testCallMethod = () => {
  it('should FOP call methods correctly', () => {
    const rawAdd = new Add()
    const justAdd = Just(rawAdd)

    const r1 = callMethod('three', [4, 5, 6], justAdd)
    expect(r1).to.equal(justAdd)

    const r2 = callMethod('three', [1, 2, 3], rawAdd)
    expect(isJust(r2)).to.equal(true)
    expect(extract(r2)).to.equal(rawAdd)

    expect(extract(callMethod('reflect', ['me'], { reflect }))).to.deep.equal({ reflect })
    expect(extract(callMethod('reflect', 'me', { reflect }))).to.deep.equal({ reflect })

    // check NJR
    expect(callMethod('three', [1, 2, 3], testOk)).to.equal(testOk)
    expect(callMethod('three', [1, 2, 3], testNothing)).to.equal(testNothing)
    expect(callMethod('three', [1, 2, 3], testFault)).to.equal(testFault)

    // check error conditions
    expect(isFault(callMethod('three', [1, 2, 3], {}))).to.equal(true)
    expect(isFault(callMethod('three', [1, 2, 3], 'non-object'))).to.equal(true)
    expect(isFault(callMethod('nomethod', [], justAdd))).to.equal(true)
    expect(isFault(callMethod('nomethod', [], rawAdd))).to.equal(true)
    expect(isFault(callMethod('nonFn', [], { nonFn: [] }))).to.equal(true)
    expect(isFault(callMethod('nonFn', [], { nonFn: {} }))).to.equal(true)
    expect(isFault(callMethod('throw', [], justAdd))).to.equal(true)
    expect(isFault(callMethod('fault', [], justAdd))).to.equal(true)
  })
}

const testCallAsyncMethod = () => {
  it('should FOP call asycn methods correctly', async () => {
    const rawAsync = new Async()
    const justAsync = Just(rawAsync)

    const resolved1 = await callAsyncMethod('resolve', ['I am resolved'], rawAsync)
    expect(isJust(resolved1)).to.equal(true)
    expect(extract(resolved1)).to.equal(rawAsync)

    const resolved2 = await callAsyncMethod('resolve', 'I am resolved too', justAsync)
    expect(resolved2).to.equal(justAsync)

    const rejected1 = await callAsyncMethod('reject', ['I am rejected'], rawAsync)
    expect(isFault(rejected1)).to.equal(true)
    const rejected2 = await callAsyncMethod('reject', ['I am rejected too'], justAsync)
    expect(isFault(rejected2)).to.equal(true)

    const thrown1 = await callAsyncMethod('throw', ['I was thrown'], rawAsync)
    expect(isFault(thrown1)).to.equal(true)
    const thrown2 = await callAsyncMethod('throw', ['I was thrown too'], justAsync)
    expect(isFault(thrown2)).to.equal(true)

    const fault1 = await callAsyncMethod('fault', ['I was thrown'], rawAsync)
    expect(isFault(fault1)).to.equal(true)
    const fault2 = await callAsyncMethod('fault', ['I was thrown too'], justAsync)
    expect(isFault(fault2)).to.equal(true)

    // test currying
    const curriedAsyncMethod = callAsyncMethod('resolve', ['I am fully resolved'])
    const curryResult = await curriedAsyncMethod(justAsync)
    expect(isJust(curryResult)).to.equal(true)
    expect(curryResult).to.equal(justAsync)

    // check error conditions
    expect(isFault(await callAsyncMethod('resolve', [1, 2, 3], {}))).to.equal(true)
    expect(isFault(await callAsyncMethod('resolve', [1, 2, 3], 'non-object'))).to.equal(true)
    expect(isFault(await callAsyncMethod('nomethod', [], rawAsync))).to.equal(true)
    expect(isFault(await callAsyncMethod('nomethod', [], justAsync))).to.equal(true)
    expect(isFault(await callAsyncMethod('nonFn', [], { nonFn: [] }))).to.equal(true)
    expect(isFault(await callAsyncMethod('nonFn', [], { nonFn: {} }))).to.equal(true)
  })
}

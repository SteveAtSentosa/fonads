import { expect } from 'chai'
import { isPromise, isTruthy, noop } from 'ramda-adjunct'
import { reflect } from '../src/utils/fn'

import { Just, Ok, Nothing, Passthrough, Fault, isJust, isFault } from '../src/fonads'
import { extract, map, chain, mapMethod, getNotes } from '../src/fonads'
import { call, callMethod } from '../src/fonads'

import {
  testOk, testNothing, testFault, testJust, testRaw,double, triple, quad, asyncAddNote,
  asyncResolve, asyncFault, asyncReject, asyncThrow, Add, Async, allGood, returnsFault, throws
} from './testHelpers'

export default function runFonadInterfaceTests() {
  describe('fonad interface tests', () => {
    testChain()
    testChainAsync()
    testMap()
    testMapAsync()
    testMapAsyncFonadOperator()
    testMapMethod()
    testMapMethodAsync()
    testCall()
    testCallAsync()
    testCallAsyncFonadOperator()
    testCallMethod()
    testCallAsyncMethod()
  })
}

const ok = Ok()
const nothing = Nothing()
const passthrough = Passthrough()
const fault = Fault({op: 'testing', msg: 'fake msg'})
const justOne = Just(1)

const testChain = () => {
  it('should chain correctly', () => {
    expect(chain(double, justOne)).to.equal(2)
    expect(chain(double, 1)).to.equal(2)
    expect(chain(double, Just(chain(double, justOne)))).to.equal(4)
    expect(chain(double, Just(chain(double, 1)))).to.equal(4)
    expect(chain(noop, ok)).to.equal(ok)
    expect(chain(noop, fault)).to.equal(fault)
    expect(chain(noop, nothing)).to.equal(nothing)
    expect(chain(noop, passthrough)).to.equal(passthrough)
  })
}

const testMap = () => {
  it('should map correctly', () => {
    expect(isJust(map(triple, justOne))).to.satisfy(isTruthy)
    expect(map(triple, justOne)).property('_val', 3)
    expect(chain(triple, map(triple, justOne))).to.equal(9)

    expect(isJust(map(quad, 2))).to.satisfy(isTruthy)
    expect(map(quad, 2)).property('_val', 8)
    expect(chain(triple, map(quad, 2))).to.equal(24)

    expect(map(noop, fault)).to.equal(fault)
    expect(map(noop, ok)).to.equal(ok)
    expect(map(noop, nothing)).to.equal(nothing)
    expect(map(noop, passthrough)).to.equal(passthrough)
  })

  it('should convert exceptions to Fault', () => {
    const throwE = () => { throw new Error('test throw') }
    const chainFault = chain(throwE, justOne)
    expect(isFault(chainFault)).to.satisfy(isTruthy)
    const mapFault = map(throwE, justOne)
    expect(isFault(mapFault)).to.satisfy(isTruthy)
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

const testChainAsync = () => {
  it('should chain async functions correctly', async () => {

    // monadic inputs

    const resolved = await chain(asyncResolve, testJust)
    expect(isJust(resolved)).to.equal(false)
    expect(resolved).to.equal(99)

    const rejected = await chain(asyncReject, testJust)
    expect(isFault(rejected)).to.satisfy(isTruthy)

    const thrown = await chain(asyncThrow, testJust)
    expect(isFault(thrown)).to.satisfy(isTruthy)

    // raw inputs

    const resolved2 = await chain(asyncResolve, 88)
    expect(isJust(resolved2)).to.equal(false)
    expect(resolved2).to.equal(88)

    const rejected2 = await chain(asyncReject, 88)
    expect(isFault(rejected2)).to.satisfy(isTruthy)

    const thrown2 = await chain(asyncThrow, 88)
    expect(isFault(thrown2)).to.satisfy(isTruthy)

    // currying

    const curriedResolver = chain(asyncResolve)
    const resolved3 = await curriedResolver(testJust)
    expect(resolved3).to.equal(99)

    const curriedRejector = chain(asyncReject)
    const rejected3 = await curriedRejector(null)
    expect(isFault(rejected3)).to.satisfy(isTruthy)

    const curriedThrower = chain(asyncThrow)
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

const testMapMethodAsync = () => {
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

const testCallAsync = () => {
  it('should FOP call async functions correctly', async () => {
    const resolved = call(asyncResolve, testJust)
    expect(isPromise(resolved)).to.equal(true)
    expect(await resolved).to.equal(testJust)

    const rejected = call(asyncReject, testJust)
    expect(isPromise(rejected)).to.equal(true)
    expect(isFault(await rejected)).to.satisfy(isTruthy)

    const thrown = call(asyncThrow, testJust)
    expect(isPromise(thrown)).to.equal(true)
    expect(isFault(await thrown)).to.satisfy(isTruthy)

    const fault = call(asyncFault, testJust)
    expect(isPromise(fault)).to.equal(true)
    expect(isFault(await fault)).to.satisfy(isTruthy)

    // raw inputs

    const resolved2 = await call(asyncResolve, 'any val')
    expect(isJust(resolved2)).to.equal(false) // no longer auto-fonadifying
    expect(resolved2).to.equal('any val')

    const rejected2 = await call(asyncReject, 'any val')
    expect(isFault(rejected2)).to.satisfy(isTruthy)

    const thrown2 = await call(asyncThrow, 'any val')
    expect(isFault(thrown2)).to.satisfy(isTruthy)

    const fault2 = await call(asyncFault, 'any val')
    expect(isFault(fault2)).to.satisfy(isTruthy)

    // currying

    const curriedResolver = call(asyncResolve)
    const resolved3 = await curriedResolver(testJust)
    expect(resolved3).to.equal(testJust)

    const curriedRejector = call(asyncReject)
    const rejected3 = await curriedRejector(null)
    expect(isFault(rejected3)).to.satisfy(isTruthy)

    const curriedThrower = call(asyncThrow)
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

const testMapAsyncFonadOperator = () => {
  it('should map async fonad opertators correctly', async () => {
    const just = Just('anything')
    const res = map(asyncAddNote('async op note'), just)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(just)
    expect(getNotes(await res)).to.deep.equal(['async op note'])
  })
}

const testCallAsyncFonadOperator = async () => {
  it('should call async fonad opertators correctly', async () => {
    const just = Just('another just')
    const res = call(asyncAddNote('async op call note'), just)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(just)
    expect(getNotes(await res)).to.deep.equal(['async op call note'])
  })
}


const testCallMethod = () => {
  it('should FOP call methods correctly', () => {
    const rawAdd = new Add()
    const justAdd = Just(rawAdd)

    const r1 = callMethod('three', [4, 5, 6], justAdd)
    expect(r1).to.equal(justAdd)

    const r2 = callMethod('three', [1, 2, 3], rawAdd)
    expect(isJust(r2)).to.equal(false) // no longer auto-fonadifying
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

    const resolved1 = await callMethod('resolve', ['I am resolved'], rawAsync)
    expect(isJust(resolved1)).to.equal(false) // no longer auto-fonadifying
    expect(extract(resolved1)).to.equal(rawAsync)

    const resolved2 = await callMethod('resolve', 'I am resolved too', justAsync)
    expect(resolved2).to.equal(justAsync)

    const rejected1 = await callMethod('reject', ['I am rejected'], rawAsync)
    expect(isFault(rejected1)).to.satisfy(isTruthy)
    const rejected2 = await callMethod('reject', ['I am rejected too'], justAsync)
    expect(isFault(rejected2)).to.satisfy(isTruthy)

    const thrown1 = await callMethod('throw', ['I was thrown'], rawAsync)
    expect(isFault(thrown1)).to.satisfy(isTruthy)
    const thrown2 = await callMethod('throw', ['I was thrown too'], justAsync)
    expect(isFault(thrown2)).to.satisfy(isTruthy)

    const fault1 = await callMethod('fault', ['I was thrown'], rawAsync)
    expect(isFault(fault1)).to.satisfy(isTruthy)
    const fault2 = await callMethod('fault', ['I was thrown too'], justAsync)
    expect(isFault(fault2)).to.satisfy(isTruthy)

    // test currying
    const curriedAsyncMethod = callMethod('resolve', ['I am fully resolved'])
    const curryResult = await curriedAsyncMethod(justAsync)
    expect(isJust(curryResult)).to.satisfy(isTruthy)
    expect(curryResult).to.equal(justAsync)

    // check error conditions
    expect(isFault(await callMethod('resolve', [1, 2, 3], {}))).to.satisfy(isTruthy)
    expect(isFault(await callMethod('resolve', [1, 2, 3], 'non-object'))).to.satisfy(isTruthy)
    expect(isFault(await callMethod('nomethod', [], rawAsync))).to.satisfy(isTruthy)
    expect(isFault(await callMethod('nomethod', [], justAsync))).to.satisfy(isTruthy)
    expect(isFault(await callMethod('nonFn', [], { nonFn: [] }))).to.satisfy(isTruthy)
    expect(isFault(await callMethod('nonFn', [], { nonFn: {} }))).to.satisfy(isTruthy)
  })
}


import { expect } from 'chai'
import { reflect } from '../src/utils/fn'

import {
  Ok,
  Just,
  Fault,
  Nothing,
  isJust,
  isFault,
  extract,
  mapAsync,
  mapMethod,
  mapAsyncMethod,
  statusMsg,
  addNote,
  getNotes,
  logFm,
} from '../src/fonads'

export default function runExtendedInterfaceTests() {
  describe('extended monadic interface tests', () => {
    const testOk = Ok()
    const testNothing = Nothing()
    const testFault = Fault()
    const testJust = Just(99)

    it('should map asycn functions correctly', async () => {

      const asyncResolve = v => new Promise(
        (resolve, reject) => setTimeout(() => { resolve(v) }, 10))

      const asyncReject = a => new Promise(
        (resolve, reject) => setTimeout(() => { reject(new Error('rejected')) }, 10))

      const timeout = () => new Promise(resolve => { setTimeout(resolve, 10) })
      const asyncThrow = async ms => {
        await timeout(ms)
        throw new Error('thrown');
      }

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



    it('should map methods correctly', () => {
      class Add {
        three(v1, v2, v3) {
          return v1 + v2 + v3
        }
        throw() {
          throw new Error('barf')
        }
      }

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
    })

    it('should map asycn methods correctly', async () => {
      class Async {
        resolve(msg) {
          return new Promise((resolve, reject) => setTimeout(() => resolve(msg), 10))
        }
        reject(msg) {
          return new Promise((resolve, reject) =>
            setTimeout(() => reject(new Error(msg)), 10),
          )
        }
        throw(msg) {
          throw new Error(msg)
        }
      }

      const rawAsync = new Async()
      const justAsync = Just(rawAsync)

      const resolved1 = await mapAsyncMethod('resolve', ['I am resolved'], rawAsync)
      expect(isJust(resolved1)).to.equal(true)
      expect(extract(resolved1)).to.equal('I am resolved')

      const resolved2 = await mapAsyncMethod('resolve', 'I am resolved too', justAsync)
      expect(isJust(resolved2)).to.equal(true)
      expect(extract(resolved2)).to.equal('I am resolved too')

      // TODO: when fault is reverted back to single fault rather than stack, check e
      const rejected1 = await mapAsyncMethod('reject', ['I am rejected'], rawAsync)
      expect(isFault(rejected1)).to.equal(true)
      const rejected2 = await mapAsyncMethod('reject', ['I am rejected too'], justAsync)
      expect(isFault(rejected2)).to.equal(true)

      // TODO: when fault is reverted back to single fault rather than stack, check e
      const thrown1 = await mapAsyncMethod('throw', ['I was thrown'], rawAsync)
      expect(isFault(thrown1)).to.equal(true)
      const thrown2 = await mapAsyncMethod('throw', ['I was thrown too'], justAsync)
      expect(isFault(thrown2)).to.equal(true)

      // test currying
      const mapGoBetween = mapAsyncMethod('resolve', ['I am fully resolved'])
      const curryResult = await mapGoBetween(justAsync)
      expect(isJust(curryResult)).to.equal(true)
      expect(extract(curryResult)).to.equal('I am fully resolved')

      // check error conditions
      expect(isFault(await mapAsyncMethod('resolve', [1, 2, 3], {}))).to.equal(true)
      expect(isFault(await mapAsyncMethod('resolve', [1, 2, 3], 'non-object'))).to.equal(
        true,
      )
      expect(isFault(await mapAsyncMethod('nomethod', [], rawAsync))).to.equal(true)
      expect(isFault(await mapAsyncMethod('nomethod', [], justAsync))).to.equal(true)
      expect(isFault(await mapAsyncMethod('nonFn', [], { nonFn: [] }))).to.equal(true)
      expect(isFault(await mapAsyncMethod('nonFn', [], { nonFn: {} }))).to.equal(true)
    })
  })
}

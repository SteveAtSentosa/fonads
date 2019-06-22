import { expect } from 'chai'

import {
  Just, Ok, Fault, Nothing, Passthrough, monadify,
  isFm, isJust, isNotJust, isFault, isNotFault, isNothing, isNotNothing,
  isOk, isNotOk, isValue, isNotValue, isStatus, isNotStatus, isPassthrough, isNotPassthrough
} from '../src/fonads'

const testJust = Just('hanging out')
const testOk = Ok()
const testNothing = Nothing()
const testFault = Fault()
const testPassthrough = Passthrough(testJust)

const ok = Ok()
const nothing = Nothing()
const fault = Fault({op: 'testing', msg: 'fake msg'})
const justOne = Just(1)
const passthrough = Passthrough(justOne)


export default function runMonadUtilTests() {
  describe('utility  tests', () => {

    it('should detect types correctly', () => {
      expect(isFm(ok)).to.equal(true)
      expect(isFm(fault)).to.equal(true)
      expect(isFm(nothing)).to.equal(true)
      expect(isFm(justOne)).to.equal(true)
      expect(isFm('ok')).to.equal(false)
      expect(isFm({})).to.equal(false)

      expect(isOk(ok)).to.equal(true)
      expect(isNotOk(ok)).to.equal(false)
      expect(isOk(justOne)).to.equal(false)
      expect(isOk('ok')).to.equal(false)
      expect(isOk({ ok })).to.equal(false)
      expect(isOk([])).to.equal(false)

      expect(isJust(justOne)).to.equal(true)
      expect(isNotJust(justOne)).to.equal(false)
      expect(isJust(nothing)).to.equal(false)

      expect(isFault(fault)).to.equal(true)
      expect(isNotFault(fault)).to.equal(false)
      expect(isFault(ok)).to.equal(false)

      expect(isNothing(nothing)).to.equal(true)
      expect(isNotNothing(nothing)).to.equal(false)
      expect(isNothing(fault)).to.equal(false)

      expect(isPassthrough(passthrough)).to.equal(true)
      expect(isNotPassthrough(passthrough)).to.equal(false)
      expect(isPassthrough(justOne)).to.equal(false)

      expect(isValue(nothing)).to.equal(true)
      expect(isValue(justOne)).to.equal(true)
      expect(isValue(fault)).to.equal(true)
      expect(isValue(ok)).to.equal(false)
      expect(isNotValue(justOne)).to.equal(false)

      expect(isStatus(fault)).to.equal(true)
      expect(isStatus(ok)).to.equal(true)
      expect(isStatus(nothing)).to.equal(false)
      expect(isStatus(justOne)).to.equal(false)
      expect(isNotStatus(ok)).to.equal(false)
    })

    it('should monadify correctly', () => {
      expect(monadify(testJust)).to.equal(testJust)
      expect(monadify(testNothing)).to.equal(testNothing)
      expect(monadify(testFault)).to.equal(testFault)
      expect(monadify(testOk)).to.equal(testOk)
      expect(monadify(testPassthrough)).to.equal(testPassthrough)
      expect(isJust(monadify('value'))).to.equal(true)
      expect(isNothing(monadify(undefined))).to.equal(true)
      expect(isNothing(monadify(null))).to.equal(true)
      expect(isFault(monadify(new Error('barf')))).to.equal(true)
    })
  })
}

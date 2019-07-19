import { expect } from 'chai'
import { isTruthy } from 'ramda-adjunct'
import { pipe } from 'ramda'
import { double, triple } from './testHelpers'
import {
  Just, Ok, Fault, Nothing, Passthrough, passthroughIf, extract, chain, map, done,
  isFm, isJust, isNotJust, isFault, isNotFault, isNothing, isPassthrough, isNotPassthrough, isNotNothing,
  isOk, isNotOk, isValue, isNotValue, isStatus, isNotStatus, isEmptyOrNilJust, isNonJustFm, isFaultOrPassthrough,
  addNote, getNotes
} from '../src/fonads'

const ok = Ok()
const nothing = Nothing()
const fault = Fault({op: 'testing', msg: 'fake msg'})
const justOne = Just(1)
const passthrough = Passthrough(justOne)

export default function runFonadTypeTests() {
  describe('fonad type tests', () => {
    // testFonadTypeDetection()
    testPassthroughs()
  })
}

const testFonadTypeDetection = () => {
  it('should detect fonad types correctly', () => {
    expect(isFm(ok)).to.deep.equal(ok)
    expect(isFm(fault)).to.deep.equal(fault)
    expect(isFm(nothing)).to.deep.equal(nothing)
    expect(isFm(justOne)).to.deep.equal(justOne)
    expect(isFm('ok')).to.equal(false)
    expect(isFm({})).to.equal(false)

    expect(isOk(ok)).to.deep.equal(ok)
    expect(isNotOk(ok)).to.equal(false)
    expect(isOk(justOne)).to.equal(false)
    expect(isOk('ok')).to.equal(false)
    expect(isOk({ ok })).to.equal(false)
    expect(isOk([])).to.equal(false)

    expect(isJust(justOne)).to.equal(justOne)
    expect(isNotJust(justOne)).to.equal(false)
    expect(isJust(nothing)).to.equal(false)

    expect(isFault(fault)).to.equal(fault)
    expect(isNotFault(fault)).to.equal(false)
    expect(isFault(ok)).to.equal(false)

    expect(isNothing(nothing)).to.equal(nothing)
    expect(isNotNothing(nothing)).to.equal(false)
    expect(isNothing(fault)).to.equal(false)

    expect(isPassthrough(passthrough)).to.equal(passthrough)
    expect(isNotPassthrough(passthrough)).to.equal(false)
    expect(isPassthrough(justOne)).to.equal(false)

    expect(isValue(nothing)).to.equal(nothing)
    expect(isValue(justOne)).to.equal(justOne)
    expect(isValue(fault)).to.equal(fault)
    expect(isValue(ok)).to.equal(false)
    expect(isNotValue(justOne)).to.equal(false)

    expect(isStatus(fault)).to.equal(fault)
    expect(isStatus(ok)).to.equal(ok)
    expect(isStatus(nothing)).to.equal(false)
    expect(isStatus(justOne)).to.equal(false)
    expect(isNotStatus(ok)).to.equal(false)

    expect(isEmptyOrNilJust(Just())).to.satisfy(isTruthy)
    expect(isEmptyOrNilJust(Just(null))).to.satisfy(isTruthy)
    expect(isEmptyOrNilJust(Just([]))).to.satisfy(isTruthy)
    expect(isEmptyOrNilJust(Just({}))).to.satisfy(isTruthy)
    expect(isEmptyOrNilJust(Just([ 'hj' ]))).to.equal(false)

    expect(isNonJustFm(Fault())).to.satisfy(isTruthy)
    expect(isNonJustFm(Ok())).to.satisfy(isTruthy)
    expect(isNonJustFm(Nothing())).to.satisfy(isTruthy)
    expect(isNonJustFm(Passthrough())).to.satisfy(isTruthy)
    expect(isNonJustFm(Just())).to.equal(false)
    expect(isNonJustFm({})).to.equal(false)

    expect(isFaultOrPassthrough(Fault())).to.satisfy(isTruthy)
    expect(isFaultOrPassthrough(Passthrough())).to.satisfy(isTruthy)
    expect(isFaultOrPassthrough(Ok())).to.equal(false)
    expect(isFaultOrPassthrough(Nothing())).to.equal(false)
    expect(isFaultOrPassthrough('hi')).to.equal(false)
  })
}

const testPassthroughs = () => {
  it('should handle passthroughs correctly', async () => {
    const cleanPassthrough = Passthrough(justOne)
    const passthroughAfterOps = pipe(
      map(double),
      chain(triple),
      addNote('nothing to see here')
    )(cleanPassthrough)

    // expect(passthroughAfterOps).to.equal(cleanPassthrough)
    // expect(getNotes(passthroughAfterOps)).to.deep.equal([])
    // expect(extract(passthroughAfterOps)).to.equal(justOne)
    // expect(done(passthroughAfterOps)).to.equal(justOne)
    // expect(done(justOne)).to.equal(justOne)
    // expect(extract(done(justOne))).to.equal(1)
    // expect(done(ok)).to.equal(ok)
    // expect(done(fault)).to.equal(fault)
    // expect(done(nothing)).to.equal(nothing)
    // expect(done(1)).to.equal(1)

    expect(isPassthrough(await passthroughIf(isFault, justOne))).to.equal(false)

    // expect(isPassthrough(await passthroughIf(isFault, fault))).to.satisfy(isTruthy)
    // expect(await passthroughIf(isFault, fault)).to.not.equal(fault)
    // expect(extract(await passthroughIf(isFault, fault))).to.equal(fault)
  })
}


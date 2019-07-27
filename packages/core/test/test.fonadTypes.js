import { expect } from 'chai'
import { pipe } from 'ramda'
import { double, triple } from './testHelpers'
import {
  Just, Ok, Fault, Nothing, Passthrough, extract, chain, map, done,
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
    testFonadTypeDetection()
    testPassthroughs()
  })
}

const testFonadTypeDetection = () => {
  it('should detect fonad types correctly', () => {
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


    expect(isEmptyOrNilJust(Just())).to.equal(true)
    expect(isEmptyOrNilJust(Just(null))).to.equal(true)
    expect(isEmptyOrNilJust(Just([]))).to.equal(true)
    expect(isEmptyOrNilJust(Just({}))).to.equal(true)
    expect(isEmptyOrNilJust(Just([ 'hj' ]))).to.equal(false)

    expect(isNonJustFm(Fault())).to.equal(true)
    expect(isNonJustFm(Ok())).to.equal(true)
    expect(isNonJustFm(Nothing())).to.equal(true)
    expect(isNonJustFm(Passthrough())).to.equal(true)
    expect(isNonJustFm(Just())).to.equal(false)
    expect(isNonJustFm({})).to.equal(false)

    expect(isFaultOrPassthrough(Fault())).to.equal(true)
    expect(isFaultOrPassthrough(Passthrough())).to.equal(true)
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

    expect(passthroughAfterOps).to.equal(cleanPassthrough)
    expect(getNotes(passthroughAfterOps)).to.deep.equal([])
    expect(extract(passthroughAfterOps)).to.equal(justOne)
    expect(done(passthroughAfterOps)).to.equal(justOne)
    expect(done(justOne)).to.equal(justOne)
    expect(extract(done(justOne))).to.equal(1)
    expect(done(ok)).to.equal(ok)
    expect(done(fault)).to.equal(fault)
    expect(done(nothing)).to.equal(nothing)
    expect(done(1)).to.equal(1)
  })
}


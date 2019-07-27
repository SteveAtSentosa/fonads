import { expect } from 'chai'
import { noop, isPromise } from 'ramda-adjunct'
import { asyncAddNote, asyncIsJust, asyncIsNotJust, testPassthrough } from './testHelpers'
import {
  Just, Nothing, Fault, Ok, map, chain, call, fCurry,
  isFonadQuery, isNotFonadQuery, isFonadUpdater, isNotFonadUpdater,  isFonadOperator, isNotFonadOperator,
  anyIsFonadOperator, noneAreFonadOperators, anyIsFonadQuery, noneAreFonadQuery,
  isFm, isNotFm, isType, isNotType, isJust, isNotJust, isFault, isNotFault, isNothing, isNotNothing,
  isOk, isNotOk, isPassthrough, isNotPassthrough, isValue, isNotValue,
  isStatus, isNotStatus, isNonJustFm, isEmptyOrNilJust, isFaultOrPassthrough,
  addNote, addClientErrMsg, addErrCode,
  addErrCodeIfNone, addNoteIf, addClientErrMsgIf, addErrCodeIf,
  extract, getNotes, getClientErrMsgMsg
} from '../src/fonads'



export default function runFonadOperatorTests() {
  describe('Fonad operator tests', () => {
    testFonadOperatorDetection()
    testFonadCurry()
    testFonadOperatorMapping()
    testAsyncFonadOperatorMapping()
    testFonadOperatorChaining()
    testFonadOperatorCalling()
  })
}

const testFonadOperatorDetection = () => {
  it('should detect fm queries correctly', () => {
    expect(isFonadQuery(isFm)).to.equal(true)
    expect(isFonadQuery(isNotFm)).to.equal(true)
    expect(isFonadQuery(isType)).to.equal(true)
    expect(isFonadQuery(isNotType)).to.equal(true)
    expect(isFonadQuery(isJust)).to.equal(true)
    expect(isFonadQuery(isNotJust)).to.equal(true)
    expect(isFonadQuery(isFault)).to.equal(true)
    expect(isFonadQuery(isNotFault)).to.equal(true)
    expect(isFonadQuery(isNothing)).to.equal(true)
    expect(isFonadQuery(isNotNothing)).to.equal(true)
    expect(isFonadQuery(isOk)).to.equal(true)
    expect(isFonadQuery(isNotOk)).to.equal(true)
    expect(isFonadQuery(isPassthrough)).to.equal(true)
    expect(isFonadQuery(isNotPassthrough)).to.equal(true)
    expect(isFonadQuery(isValue)).to.equal(true)
    expect(isFonadQuery(isNotValue)).to.equal(true)
    expect(isFonadQuery(isStatus)).to.equal(true)
    expect(isFonadQuery(isNotStatus)).to.equal(true)
    expect(isFonadQuery(isNonJustFm)).to.equal(true)
    expect(isFonadQuery(isEmptyOrNilJust)).to.equal(true)
    expect(isFonadQuery(isFaultOrPassthrough)).to.equal(true)
    expect(isFonadQuery(noop)).to.equal(false)
    expect(isFonadQuery({})).to.equal(false)
    expect(isFonadQuery()).to.equal(false)

    expect(isFonadQuery(addNote)).to.equal(false)
    expect(isFonadQuery(addClientErrMsg)).to.equal(false)
    expect(isFonadQuery(addErrCode)).to.equal(false)

    expect(anyIsFonadOperator(isNotFm)).to.equal(true)
    expect(anyIsFonadOperator(noop)).to.equal(false)
    expect(anyIsFonadOperator([noop, isOk, noop])).to.equal(true)
    expect(anyIsFonadOperator([noop, noop, noop])).to.equal(false)

    expect(noneAreFonadOperators(isNotFm)).to.equal(false)
    expect(noneAreFonadOperators(noop)).to.equal(true)
    expect(noneAreFonadOperators([noop, isOk, noop])).to.equal(false)
    expect(noneAreFonadOperators([noop, noop, noop])).to.equal(true)

    expect(anyIsFonadQuery(isNotFm)).to.equal(true)
    expect(anyIsFonadQuery(noop)).to.equal(false)
    expect(anyIsFonadQuery(addNote)).to.equal(false)
    expect(anyIsFonadQuery([addNote, addClientErrMsg, addErrCode])).to.equal(false)
    expect(anyIsFonadQuery([addNote, noop, isJust, addErrCode])).to.equal(true)

    expect(noneAreFonadQuery(isNonJustFm)).to.equal(false)
    expect(noneAreFonadQuery(noop)).to.equal(true)
    expect(noneAreFonadQuery([addNote, noop])).to.equal(true)
    expect(noneAreFonadQuery([addNote, addClientErrMsg, addErrCode])).to.equal(true)
    expect(noneAreFonadQuery([addNote, noop, isJust, addErrCode])).to.equal(false)
  })

  it('should detect fm updaters correctly', () => {
    expect(isFonadUpdater(addNote)).to.equal(true)
    expect(isFonadUpdater(addClientErrMsg)).to.equal(true)
    expect(isFonadUpdater(addErrCode)).to.equal(true)
    expect(isNotFonadUpdater(addNote)).to.equal(false)
    expect(isNotFonadUpdater(addClientErrMsg)).to.equal(false)
    expect(isNotFonadUpdater(addErrCode)).to.equal(false)

    expect(isFonadUpdater(isFm)).to.equal(false)
    expect(isFonadUpdater(isNotFm)).to.equal(false)
    expect(isFonadUpdater(isType)).to.equal(false)
    expect(isFonadUpdater(isNotType)).to.equal(false)
    expect(isFonadUpdater(isJust)).to.equal(false)
    expect(isFonadUpdater(isNotJust)).to.equal(false)
    expect(isFonadUpdater(isFault)).to.equal(false)
    expect(isFonadUpdater(isNotFault)).to.equal(false)
    expect(isFonadUpdater(isNothing)).to.equal(false)
    expect(isFonadUpdater(isNotNothing)).to.equal(false)
    expect(isFonadUpdater(isOk)).to.equal(false)
    expect(isFonadUpdater(isNotOk)).to.equal(false)
    expect(isFonadUpdater(isPassthrough)).to.equal(false)
    expect(isFonadUpdater(isNotPassthrough)).to.equal(false)
    expect(isFonadUpdater(isValue)).to.equal(false)
    expect(isFonadUpdater(isNotValue)).to.equal(false)
    expect(isFonadUpdater(isStatus)).to.equal(false)
    expect(isFonadUpdater(isNotStatus)).to.equal(false)
    expect(isFonadUpdater(isNonJustFm)).to.equal(false)
    expect(isFonadUpdater(isEmptyOrNilJust)).to.equal(false)
    expect(isFonadUpdater(isFaultOrPassthrough)).to.equal(false)

    expect(isFonadUpdater(addNote)).to.equal(true)
    expect(isFonadUpdater(addClientErrMsg)).to.equal(true)
    expect(isFonadUpdater(addErrCode)).to.equal(true)
  })
  it('should detect fm operators correctly', () => {
    expect(isFonadOperator(isFm)).to.equal(true)
    expect(isFonadOperator(isNotFm)).to.equal(true)
    expect(isFonadOperator(isType)).to.equal(true)
    expect(isFonadOperator(isNotType)).to.equal(true)
    expect(isFonadOperator(isJust)).to.equal(true)
    expect(isFonadOperator(isNotJust)).to.equal(true)
    expect(isFonadOperator(isFault)).to.equal(true)
    expect(isFonadOperator(isNotFault)).to.equal(true)
    expect(isFonadOperator(isNothing)).to.equal(true)
    expect(isFonadOperator(isNotNothing)).to.equal(true)
    expect(isFonadOperator(isOk)).to.equal(true)
    expect(isFonadOperator(isNotOk)).to.equal(true)
    expect(isFonadOperator(isPassthrough)).to.equal(true)
    expect(isFonadOperator(isNotPassthrough)).to.equal(true)
    expect(isFonadOperator(isValue)).to.equal(true)
    expect(isFonadOperator(isNotValue)).to.equal(true)
    expect(isFonadOperator(isStatus)).to.equal(true)
    expect(isFonadOperator(isNotStatus)).to.equal(true)
    expect(isFonadOperator(isNonJustFm)).to.equal(true)
    expect(isFonadOperator(isEmptyOrNilJust)).to.equal(true)
    expect(isFonadOperator(isFaultOrPassthrough)).to.equal(true)

    expect(isNotFonadOperator(isFm)).to.equal(false)
    expect(isNotFonadOperator(isNotFm)).to.equal(false)
    expect(isNotFonadOperator(isType)).to.equal(false)
    expect(isNotFonadOperator(isNotType)).to.equal(false)
    expect(isNotFonadOperator(isJust)).to.equal(false)
    expect(isNotFonadOperator(isNotJust)).to.equal(false)
    expect(isNotFonadOperator(isFault)).to.equal(false)
    expect(isNotFonadOperator(isNotFault)).to.equal(false)
    expect(isNotFonadOperator(isNothing)).to.equal(false)
    expect(isNotFonadOperator(isNotNothing)).to.equal(false)
    expect(isNotFonadOperator(isOk)).to.equal(false)
    expect(isNotFonadOperator(isNotOk)).to.equal(false)
    expect(isNotFonadOperator(isPassthrough)).to.equal(false)
    expect(isNotFonadOperator(isNotPassthrough)).to.equal(false)
    expect(isNotFonadOperator(isValue)).to.equal(false)
    expect(isNotFonadOperator(isNotValue)).to.equal(false)
    expect(isNotFonadOperator(isStatus)).to.equal(false)
    expect(isNotFonadOperator(isNotStatus)).to.equal(false)
    expect(isNotFonadOperator(isNonJustFm)).to.equal(false)
    expect(isNotFonadOperator(isEmptyOrNilJust)).to.equal(false)
    expect(isNotFonadOperator(isFaultOrPassthrough)).to.equal(false)

    expect(isFonadOperator(addNote)).to.equal(true)
    expect(isFonadOperator(addClientErrMsg)).to.equal(true)
    expect(isFonadOperator(addErrCode)).to.equal(true)

    expect(isNotFonadOperator(addNote)).to.equal(false)
    expect(isNotFonadOperator(addClientErrMsg)).to.equal(false)
    expect(isNotFonadOperator(addErrCode)).to.equal(false)

    expect(isFonadOperator(addErrCodeIfNone)).to.equal(false)
    expect(isFonadOperator(addNoteIf)).to.equal(false)
    expect(isFonadOperator(addClientErrMsgIf)).to.equal(false)
    expect(isFonadOperator(addErrCodeIf)).to.equal(false)

  })
}

const testFonadCurry = () => {
  it('should fCurry correctly', () => {
    let fnToCurry = (a, b, c, d) => `${a}${b}${c}${d}`
    let curriedFn = fCurry(fnToCurry, {fonadUpdater: 'pokeFm'})
    let partial1 = curriedFn('a')
    let partial2 = partial1('b')
    let partial3 = partial2('c')
    let final = partial3('d')

    expect(isFonadUpdater(curriedFn)).to.equal(true)
    expect(isNotFonadUpdater(curriedFn)).to.equal(false)
    expect(isFonadQuery(curriedFn)).to.equal(false)
    expect(isNotFonadQuery(curriedFn)).to.equal(true)

    expect(isFonadUpdater(partial1)).to.equal(true)
    expect(isNotFonadUpdater(partial1)).to.equal(false)
    expect(isFonadQuery(partial1)).to.equal(false)
    expect(isNotFonadQuery(partial1)).to.equal(true)

    expect(isFonadUpdater(partial2)).to.equal(true)
    expect(isNotFonadUpdater(partial2)).to.equal(false)
    expect(isFonadQuery(partial2)).to.equal(false)
    expect(isNotFonadQuery(partial2)).to.equal(true)

    expect(isFonadUpdater(partial3)).to.equal(true)
    expect(isNotFonadUpdater(partial3)).to.equal(false)
    expect(isFonadQuery(partial3)).to.equal(false)
    expect(isNotFonadQuery(partial3)).to.equal(true)

    expect(final).to.equal('abcd')

    fnToCurry = (a, b) => `${a}${b}`
    curriedFn = fCurry(fnToCurry, {fonadQuery: 'askFm'})
    partial1 = curriedFn('a')
    final = partial1('b')

    expect(isFonadQuery(curriedFn)).to.equal(true)
    expect(isNotFonadQuery(curriedFn)).to.equal(false)
    expect(isFonadUpdater(curriedFn)).to.equal(false)
    expect(isNotFonadUpdater(curriedFn)).to.equal(true)

    expect(isFonadQuery(partial1)).to.equal(true)
    expect(isNotFonadQuery(partial1)).to.equal(false)
    expect(isFonadUpdater(partial1)).to.equal(false)
    expect(isNotFonadUpdater(partial1)).to.equal(true)

    expect(final).to.equal('ab')

    fnToCurry = a => `${a}`
    curriedFn = fCurry(fnToCurry, {fonadQuery: 'askFm', fonadUpdater: 'pokeFm'})
    final = curriedFn('a')

    expect(isFonadQuery(curriedFn)).to.equal(true)
    expect(isNotFonadQuery(curriedFn)).to.equal(false)
    expect(isFonadUpdater(curriedFn)).to.equal(true)
    expect(isNotFonadUpdater(curriedFn)).to.equal(false)

    expect(final).to.equal('a')
  })
}

const testFonadOperatorMapping = () => {
  it('should map sync fonad opertators correctly', () => {
    let res
    const just = Just('anything')
    const fault = Fault('damn it')

    res = map(isJust, Just())
    expect(isJust(res)).to.equal(true)
    expect(extract(res)).to.equal(true)

    res = map(isNotNothing, Nothing())
    expect(isJust(res)).to.equal(true)
    expect(extract(res)).to.equal(false)

    res = map(isNonJustFm, Fault())
    expect(isJust(res)).to.equal(true)
    expect(extract(res)).to.equal(true)

    res = map(addNote('op note'), just)
    expect(res).to.equal(just)
    expect(getNotes(res)).to.deep.equal(['op note'])

    res = map(addClientErrMsg('client err msg'), fault)
    expect(res).to.equal(fault)
    expect(getClientErrMsgMsg(res)).to.equal('client err msg')
  })
}

const testAsyncFonadOperatorMapping = () => {
  it('should map asycn fonad opertators correctly', async () => {

    const just = Just('anything')
    expect(isFonadOperator(asyncAddNote)).to.equal(true)
    let res = map(asyncAddNote('async op note'), just)
    let resResolved = await res
    expect(isPromise(res)).to.equal(true)
    expect(resResolved).to.equal(just)
    expect(getNotes(resResolved)).to.deep.equal(['async op note'])

    expect(isFonadOperator(asyncIsJust)).to.equal(true)
    res = map(asyncIsJust, just)
    resResolved = await res
    expect(isPromise(res)).to.equal(true)
    expect(isJust(resResolved)).to.equal(true)
    expect(extract(resResolved)).to.equal(true)

    expect(isFonadOperator(asyncIsNotJust)).to.equal(true)
    res = map(asyncIsNotJust, just)
    resResolved = await res
    expect(isPromise(res)).to.equal(true)
    expect(isJust(resResolved)).to.equal(true)
    expect(extract(resResolved)).to.equal(false)
  })
}

const testFonadOperatorChaining = () => {
  it('should chain sync fonad opertators correctly', async () => {
    expect(chain(isJust, Just())).to.equal(true)
    expect(chain(isOk, Fault())).to.equal(false)
    expect(chain(isFm, {})).to.equal(false)

    expect(isFault(chain(addNote, Just))).to.equal(true)
    expect(isFault(chain(addClientErrMsg, Just))).to.equal(true)
    expect(isFault(chain(addErrCode, Just))).to.equal(true)

    expect(isFonadOperator(asyncIsJust)).to.equal(true)
    let res = chain(asyncIsJust, Just())
    let resResolved = await res
    expect(isPromise(res)).to.equal(true)
    expect(isFm(resResolved)).to.equal(false)
    expect(resResolved).to.equal(true)

    expect(isFonadOperator(asyncAddNote)).to.equal(true)
    res = chain(asyncAddNote('async op note'), Just())
    expect(isFault(res)).to.equal(true)
  })
}

const testFonadOperatorCalling = () => {
  it('should map sync fonad opertator calling correctly', async() => {
    let res
    let just = Just('anything')
    let fault = Fault('damn it')

    res = call(isJust, just)
    expect(res).to.equal(just)

    res = call(addNote('all good'), just)
    expect(res).to.equal(just)
    expect(getNotes(res)).to.deep.equal(['all good'])

    res = await call([addNote('gosh'), isJust, addNote('oh my')], fault)
    expect(res).to.equal(fault)
    expect(getNotes(res)).to.deep.equal(['oh my', 'gosh'])

    just = Just('another`')

    res = await call([asyncAddNote('here'), asyncIsJust, addNote('from'), isFault, asyncAddNote('not')], just)
    expect(res).to.equal(just)
    expect(getNotes(res)).to.deep.equal(['not', 'from', 'here'])
  })
}



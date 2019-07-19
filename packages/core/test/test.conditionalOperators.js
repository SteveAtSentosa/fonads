import { expect } from 'chai'
import { isPromise, isTruthy, noop } from 'ramda-adjunct'
import {
  Fault, Just,  isFault, isJust,
  callIf, callMethodIf, callOnFault, passthroughIf, faultIf, caseOf, orElse, addNote, getNotes, getExceptionMsg,
  mapMethod, chainMethod, extract, fEq, reflect
} from '../src/fonads'
import {
  returnsTrue, returnsFalse, returnsTrueAsync, returnsTruePromise,  truePromise, returnsFalseAsync, asyncSquare, asyncIsJust, asyncIsNotJust,
  double, fDouble, fTriple, fDoubleAsync, fTripleAsync, fQuadAsync,
  getMe, clearMe, setMe, doubleMe, squareMe, asyncSquareMe, doit, bail,
  asyncAddNote, asyncFault, testFault, testJust,
  returnsFault, throws, allGood, asyncThrow, asyncReject,
  Add, AddAsync, falsePromise,
} from './testHelpers'

export default function runCondtionalOperatorTests() {
  describe('Conditional operator tests', () => {
    testCallIf()
    testCallMethodIf()
    testCallOnFault()
    testPassthroughIf()
    testCaseOf()
  })
}

const testCallIf = () => {
  it('should handle callIf correctly', async () => {

    // mixing fonadic and non fonadic operators
    // mixing sync and asyn condition lists

    let res
    const justThree = Just(3)

    // non fault

    clearMe()
    res = await callIf(isJust, setMe, justThree)
    expect(res).to.equal(justThree)
    expect(getMe()).to.equal(3)


    clearMe()
    res = await callIf(isFault, setMe, justThree)
    expect(res).to.equal(justThree)
    expect(getMe()).to.equal(null)

    clearMe()
    res = await callIf([isJust, doit], [setMe, doubleMe, doubleMe], justThree)
    expect(res).to.equal(justThree)
    expect(getMe()).to.equal(12)

    clearMe()
    res = await callIf(
      [isJust, true, returnsTrueAsync, returnsTrue, true, asyncIsJust],
      [setMe, addNote('1'), asyncSquareMe, asyncAddNote('2'), doubleMe],
      justThree
    )
    expect(res).to.equal(justThree)
    expect(getMe()).to.equal(18)
    expect(getNotes(justThree)).to.deep.equal(['2', '1'])

    clearMe()
    res = await callIf([ true, returnsTrueAsync, asyncIsNotJust, returnsTrue ], [setMe, doubleMe], justThree)
    expect(res).to.equal(justThree)
    expect(getMe()).to.equal(null)

    clearMe()
    res = await callIf([ true, returnsTrueAsync, returnsTrue, returnsFalse ], [setMe, doubleMe], justThree)
    expect(res).to.equal(justThree)
    expect(getMe()).to.equal(null)

    clearMe()
    res = await callIf([ true, returnsTrueAsync, returnsFalseAsync, returnsTrue ], [setMe, doubleMe], justThree)
    expect(res).to.equal(justThree)
    expect(getMe()).to.equal(null)

    // fault

    res = await callIf(true, [setMe, returnsFault, doubleMe], justThree)
    expect(res).to.equal(testFault)

    res = await callIf(true, [ asyncFault, setMe, doubleMe ], justThree)
    expect(res).to.equal(testFault)

    // throw

    res = await callIf(true, [ throws, returnsFault ], justThree)
    expect(isFault(res)).to.satisfy(isTruthy)
    expect(getExceptionMsg(await res)).to.equal('thrown')

    res = await callIf(true, [ allGood, allGood, asyncThrow, allGood ], justThree)
    expect(isFault(res)).to.satisfy(isTruthy)
    expect(getExceptionMsg(await res)).to.equal('thrown')

    // reject

    res = await callIf(true, [ noop, noop, asyncReject, allGood ], justThree)
    expect(isFault(res)).to.satisfy(isTruthy)
    expect(getExceptionMsg(await res)).to.equal('rejected')
  })
}

const testCallMethodIf = () => {
  it('should handle callMethodIf correctly', async () => {

    // sync

    const rawAdd = new Add()
    const justAdd = Just(rawAdd)

    let res = callMethodIf(true, 'three', [2, 4, 6], justAdd)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(justAdd)
    expect(fEq(12, mapMethod('getVal', [], justAdd))).to.equal(true)

    res = callMethodIf(true, 'three', [2, 4, 6], rawAdd)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(rawAdd) // not auto-fonadifying
    expect(rawAdd.getVal()).to.equal(12)

    res = callMethodIf([true, returnsTrue, true, returnsFalse], 'three', [5, 5, 5], justAdd)
    expect(await res).to.equal(justAdd)
    expect(fEq(12, mapMethod('getVal', [], justAdd))).to.equal(true)

    // async

    const rawAddAsync = new AddAsync()
    const justAddAsync = Just(rawAddAsync)
    res = callMethodIf(true, 'setVal', [10], justAddAsync)
    expect(isPromise(res)).to.equal(true)
    expect(await chainMethod('getVal', [], await res)).to.equal(10)
  })
  // invalid input
  // fault
  // throw
  // reject
  xit('should test callMethodIf fault cases')
}

// const testCallOnFault = () => xit('should test callOnFault')
const testCallOnFault = async () => {

  it('should handle testCallOnFault correctly', async () => {

    // sync

    const syncFault = Fault('sync fault')

    let res = callOnFault(addNote('should not be added'), testJust)
    expect(isPromise(res)).to.equal(false)
    expect(await res).to.equal(testJust)
    expect(getNotes(testJust)).to.deep.equal([])

    res = callOnFault(addNote('bad times sync'), syncFault)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(syncFault)
    expect(getNotes(syncFault)).to.deep.equal(['bad times sync'])

    // asycn

    const asyncFault = Fault('async fault')

    res = callOnFault(asyncAddNote('should not be added'), testJust)
    expect(isPromise(res)).to.equal(false)
    expect(await res).to.equal(testJust)
    expect(getNotes(testJust)).to.deep.equal([])

    res = callOnFault(asyncAddNote('bad times async'), asyncFault)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(asyncFault)
    expect(getNotes(asyncFault)).to.deep.equal(['bad times async'])

    // non fonad operators

    res = callOnFault(() => setMe(22), testFault)
    expect(isFault(res)).to.satisfy(isTruthy)
  })
  // fault/throw/reject
  xit('should test callOnFault() fault conditions')
}

const testPassthroughIf = () => xit('should test passthroughIf')

const testCaseOf = () => {
  it('should hanndle caseof correctly', async () => {

    const just7 = Just(7)
    let res

    res = await caseOf([
      [ isFault, reflect ],
      [ isJust, extract ]
    ], just7)
    expect(res).to.equal(7)

    res = await caseOf([
      [ isFault, reflect ],
      [ [true, isJust, returnsTrue, returnsTrueAsync], fDouble ],
    ], just7)
    expect(isJust(res)).to.satisfy(isTruthy)
    expect(extract(res)).to.deep.equal(14)


    res = await caseOf([
      [ isFault, reflect ],
      [ [true, isJust, returnsTrue, returnsTrueAsync], [fDouble] ],
    ], just7)
    expect(isJust(res)).to.satisfy(isTruthy)
    expect(extract(res)).to.deep.equal(14)

    res = await caseOf([
      [ isFault, reflect ],
      [ [true, isJust, returnsTrue, returnsTrueAsync], [fDoubleAsync, fTriple] ],
      [ true, reflect ]
    ], just7)
    expect(isJust(res)).to.satisfy(isTruthy)
    expect(extract(res)).to.deep.equal(42)

    res = await caseOf([
      [ isFault, reflect ],
      [ false,reflect ],
      [ [false, falsePromise], reflect ],
      [ [true, isJust, returnsTruePromise, Just(true), returnsTrueAsync, truePromise], fTripleAsync ],
      [ false, () => null ],
      [ orElse, () => null ]
    ], just7)
    expect(isJust(res)).to.satisfy(isTruthy)
    expect(extract(res)).to.deep.equal(21)

    res = await caseOf([
      [ [true, returnsFalseAsync], fDouble ],
      [ [true, falsePromise], fTripleAsync ],
      [ orElse, [fDouble, fQuadAsync] ],
    ], just7)
    expect(isJust(res)).to.satisfy(isTruthy)
    expect(extract(res)).to.deep.equal(56)
  })

  xit('should test more caseOf scenarios')
}


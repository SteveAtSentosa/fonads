import { expect } from 'chai'
import { equals, lt, gt } from 'ramda'
import { isPromise, isTrue, isFalse, isString, noop } from 'ramda-adjunct'
import {
  testJust, testOk, testFault,
  asyncResolve, returnsTrue, returnsFalse, returnsTrueAsync, returnsJustTrue, returnsJustFalse, throws, asyncThrow,
  returnsJustTrueAsync, returnsJustFalseAsync, returnsFalseAsync, asyncEq, asyncGt, asyncLt, asyncIsJust,
  truePromise, justTruePromise, falsePromise, justFalsePromise, returnsTruePromise, asyncReject,
  returnsFault, returnsJust, returnsOk, returnsNothing, returnsPassthrough, returnsFaultAsync,
  isTrueAsync, isFalseAsync
} from './testHelpers'
import {
  Just, Nothing, Ok, Fault, Passthorugh, check, checkPredList,
  isFm, isJust, isNotJust, isNotFault, isNotFm, isOk,
  getExceptionMsg
} from '../src/fonads'

export default function runConditionalListTests() {
  describe('conditional list tests', () => {
    testPredListsSync()
    testPredListsAsync()
    testPredListsMixed()
    testPredListsReflection()
    testConditionListsHard()
    testConditionListsSync()
    testConditionListsAsync()
    testConditionListsMixed()
    testPredListFaults()
    testConditionListFaults()
  })
}

const testPredListsSync = () => {
  it('should evaluate sync pred lists correctly', async () => {

    const justTrue = Just(true)
    const dummy = 'dummy'

    let res = checkPredList(isTrue, true)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = checkPredList(returnsJustTrue, dummy)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = checkPredList(returnsJustFalse, dummy)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = checkPredList(isTrue, justTrue)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = checkPredList(isFalse, justTrue)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = checkPredList([isFalse, isFalse, isFalse], false)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = checkPredList([isFalse, isTrue, isFalse], justTrue)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)
  })
}


const testPredListsAsync = () => {
  it('should evaluate async pred lists correctly', async () => {

    const justTrue = Just(true)
    const justFalse = Just(false)
    const dummy = 'dummy'

    let res = checkPredList(isTrueAsync, true)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = checkPredList(returnsJustTrueAsync, dummy)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = checkPredList(returnsJustFalseAsync, dummy)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = checkPredList(isFalseAsync, justTrue)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = checkPredList([isTrueAsync, returnsJustTrueAsync, isTrueAsync, isTrueAsync], true)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = checkPredList([isTrueAsync, returnsJustFalseAsync, isTrueAsync, isTrueAsync], true)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = checkPredList([isFalseAsync, isFalseAsync, isFalseAsync], justFalse)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = checkPredList([isTrueAsync, isFalseAsync, isTrueAsync], false)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = checkPredList([isFalseAsync, isTrueAsync, isFalseAsync], justFalse)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)
  })
}

const testPredListsMixed = () => {
  it('should evaluate mixed pred lists correctly', async () => {

    const justTrue = Just(true)

    let res = checkPredList([isFalseAsync, isFalse, isFalseAsync], false)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = checkPredList([isFalse, isTrue, isTrueAsync], justTrue)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = checkPredList([isTrue, isTrueAsync, isFalseAsync], justTrue)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = checkPredList([isTrue, isTrueAsync, isFalseAsync], justTrue)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)
  })
}

const testPredListsReflection = () => {
  it('should evaluate preds that return fonads correctly', async () => {

    const just = Just('hanging out')

    // fonad returned by pred

    let res = checkPredList(returnsNothing, just)
    let resolvedRes = await res
    expect(isPromise(res)).to.equal(true)
    expect(resolvedRes).to.equal(false)

    res = checkPredList(returnsPassthrough, just)
    resolvedRes = await res
    expect(isPromise(res)).to.equal(true)
    expect(resolvedRes).to.equal(false)

    res = checkPredList(returnsOk, just)
    resolvedRes = await res
    expect(isPromise(res)).to.equal(true)
    expect(resolvedRes).to.equal(true)

    res = checkPredList(returnsFault, just)
    resolvedRes = await res
    expect(isPromise(res)).to.equal(true)
    expect(resolvedRes).to.equal(testFault)
  })
}

const testConditionListsHard = () => {
  it('should evaluate hard condition lists correctly', async () => {

    const dummy = 'dummy'

    let res = check(true, dummy)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check('truthy', dummy)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check(Just(true), dummy)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check([truePromise, justTruePromise, true, Just(true)], dummy)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check([true, true, false], dummy)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([true, true, Just(false)], dummy)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([true, true, Just(false)], dummy)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([true, true, falsePromise], dummy)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([true, true, justFalsePromise], dummy)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check(false, 'anything')
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check(Just(false), 'anything')
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([true, Just(true), true], null)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check([true, false, true], [])
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([true, true, Just(false)], [])
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)
  })
}

const testConditionListsSync = () => {

  it('should evaluate sync pred condition lists correctly', async () => {

    let res = check(equals(99), 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check(returnsTruePromise, 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check(isJust, 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([lt(100), gt(100)], 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([lt(100), returnsTrue, gt(100, isJust)], Just(101))
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([lt(50), lt(75), returnsJustTrue], 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check([lt(50), lt(75), isJust], Just(99))
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check([lt(50), lt(75), isJust], 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([isJust, isFm, isNotFault], testJust)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check([isOk, isNotFm, isNotFault], testOk)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)
  })
}


const testConditionListsAsync = () => {

  it('should evaluate asycn pred condition lists correctly', async () => {

    let res = check(asyncEq(99), 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check([asyncLt(10), asyncEq(99), asyncIsJust], 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([asyncLt(10), asyncEq(99), asyncIsJust], Just(99))
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check([asyncLt(100), asyncGt(100), asyncLt], Just(101))
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([asyncLt(50), asyncLt(75)], 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check([asyncLt(50), asyncLt(75)], Just(99))
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check([asyncLt(50), asyncLt(75), asyncIsJust], 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

  })
}

const testConditionListsMixed = () => {

  it('should evaluate mixed condition lists correctly', async () => {

    let res = check([returnsTrue, true, returnsJustTrue, returnsTrueAsync, Just(true), asyncIsJust], Just(99))
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check([returnsTrue, true, returnsTrueAsync, false, asyncIsJust], Just(99))
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([returnsTrue, true, returnsTrueAsync, returnsFalse, asyncIsJust], Just(99))
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([returnsTrue, true, returnsTrueAsync, Just(false), asyncIsJust], Just(99))
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([returnsTrue, true, returnsTrueAsync, returnsFalseAsync, asyncIsJust], Just(99))
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([returnsTrueAsync, returnsTrue, isJust], 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([returnsTrueAsync, returnsTrue, isNotJust], 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check([equals(99), true, asyncEq(99), returnsTrue, Just(true), returnsTrueAsync], 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check([equals(99), true, asyncEq(99), returnsTrue, true, returnsTrueAsync], 100)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)
  })
}

const testPredListFaults = () => {
  it('should handle preds that return faults correctly', async () => {

    // fault

    let res = checkPredList([isFalseAsync, returnsFault, isFalseAsync], false)
    let resolvedRes = await res
    expect(isPromise(res)).to.equal(true)
    expect(resolvedRes).to.equal(testFault)

    res = checkPredList([returnsFaultAsync, returnsTrue, returnsFalseAsync], false)
    resolvedRes = await res
    expect(isPromise(res)).to.equal(true)
    expect(resolvedRes).to.equal(testFault)

    // Throw

    res = checkPredList(throws, 'any')
    resolvedRes = await res
    expect(isPromise(res)).to.equal(true)
    expect(getExceptionMsg(resolvedRes)).to.equal('thrown')

    checkPredList([returnsTrue, returnsFalseAsync, isString,  asyncThrow], 'any')
    resolvedRes = await res
    expect(isPromise(res)).to.equal(true)
    expect(getExceptionMsg(resolvedRes)).to.equal('thrown')

    // reject

    res = checkPredList([isTrue, returnsTrue, asyncReject], 'any')
    resolvedRes = await res
    expect(isPromise(res)).to.equal(true)
    expect(getExceptionMsg(resolvedRes)).to.equal('rejected')
  })
}



const testConditionListFaults = () => {
  it('should handle preds that return faults correctly', async () => {

    // fault

    let res = check([returnsFault, returnsTrue, true, returnsTrueAsync, false, asyncIsJust], Just(99))
    let resolvedRes = await res
    expect(isPromise(res)).to.equal(true)
    expect(resolvedRes).to.equal(testFault)


    res = check([returnsTrue, true, returnsTrueAsync, returnsFaultAsync, Just(false), asyncIsJust], Just(99))
    resolvedRes = await res
    expect(isPromise(res)).to.equal(true)
    expect(resolvedRes).to.equal(testFault)

    // Throw

    res = check([lt(50), lt(75), returnsJustTrue, throws], 99)
    resolvedRes = await res
    expect(isPromise(res)).to.equal(true)
    expect(getExceptionMsg(resolvedRes)).to.equal('thrown')

    res = check([asyncThrow, returnsTrue, returnsTrueAsync, returnsFalseAsync, asyncIsJust], Just(99))
    expect(isPromise(res)).to.equal(true)
    resolvedRes = await res
    expect(getExceptionMsg(resolvedRes)).to.equal('thrown')

    // reject
    res = check([equals(99), true, asyncEq(99), returnsTrue, asyncReject, true, returnsTrueAsync], 100)
    expect(isPromise(res)).to.equal(true)
    resolvedRes = await res
    expect(getExceptionMsg(resolvedRes)).to.equal('rejected')
  })
}


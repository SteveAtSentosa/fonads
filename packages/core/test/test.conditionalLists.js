import { expect } from 'chai'
import { equals, lt, gt } from 'ramda'
import { isPromise, isTrue, isFalse } from 'ramda-adjunct'
import {
  testJust, testOk,
  asyncResolve, returnsTrue, returnsFalse, returnsTrueAsync,
  returnsFalseAsync, asyncEq, asyncGt, asyncLt, asyncIsJust
} from './testHelpers'
import {
  Just, check, checkPredList,
  isFm, isJust, isNotJust, isNotFault, isNotFm, isOk,
} from '../src/fonads'

export default function runConditionalListTests() {
  describe('conditional list tests', () => {
    testPredLists()
    testConditionListsHard()
    testConditionListsSync()
    testConditionListsAsync()
    testConditionListsMixed()
    testPredListFaults()
    testConditionListFaults()
  })
}

const testPredLists = () => {
  it('should evaluate pred lists correctly', async () => {

    // sycn preds only

    const justTrue = Just(true)
    const justFalse = Just(false)

    let res = checkPredList(isTrue, true)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

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

    // async preds only

    const isTrueAsync = v => asyncResolve(isTrue(v))
    const isFalseAsync = v => asyncResolve(isFalse(v))

    res = checkPredList(isTrueAsync, true)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = checkPredList(isFalseAsync, justTrue)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = checkPredList([isTrueAsync, isTrueAsync, isTrueAsync], true)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = checkPredList([isFalseAsync, isFalseAsync, isFalseAsync], justFalse)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = checkPredList([isTrueAsync, isFalseAsync, isTrueAsync], false)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = checkPredList([isFalseAsync, isTrueAsync, isFalseAsync], justFalse)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)


    // mixture

    res = checkPredList([isFalseAsync, isFalse, isFalseAsync], false)
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

const testConditionListsHard = () => {

  it('should evaluate hard condition lists correctly', async () => {

    let res = check(true, testJust)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check(false, 'anything')
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([true, true, true], null)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check([true, false, true], [])
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

  })
}

const testConditionListsSync = () => {

  it('should evaluate sync pred condition lists correctly', async () => {

    let res = check(equals(99), 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check(isJust, 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([lt(100), gt(100)], 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([lt(100), gt(100, isJust)], Just(101))
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([lt(50), lt(75)], 99)
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

    let res = check([returnsTrue, true, returnsTrueAsync, true, asyncIsJust], Just(99))
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check([returnsTrue, true, returnsTrueAsync, false, asyncIsJust], Just(99))
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)

    res = check([returnsTrue, true, returnsTrueAsync, returnsFalse, asyncIsJust], Just(99))
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

    res = check([equals(99), true, asyncEq(99), returnsTrue, true, returnsTrueAsync], 99)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(true)

    res = check([equals(99), true, asyncEq(99), returnsTrue, true, returnsTrueAsync], 100)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(false)
  })
}

const testPredListFaults = () => xit('should tests pred list faults')
const testConditionListFaults = () => xit('should tests conditional list faults')

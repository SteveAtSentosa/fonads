import { expect } from 'chai'
import { equals, lt, gt } from 'ramda'
import { isPromise, isTruthy, isTrue, isFalse } from 'ramda-adjunct'
import {
  testJust, testOk, testNothing, testFault, testPassthrough,
  double, triple, square, quad, asyncDouble, asyncTriple, asyncQuad, asyncSquare, asyncResolve,
  returnsTrue, returnsFalse, returnsTrueAsync, returnsFalseAsync, asyncEq, asyncGt, asyncLt, asyncIsJust
} from './testHelpers'
import {
  Just, Ok, Fault, Nothing, Passthrough, fonadify, extract, check, checkPredList,
  isFm, isJust, isNotJust, isFault, isNotFault, isNothing, isPassthrough, isNotPassthrough, isNotNothing, isNotFm,
  isOk, isNotOk, isValue, isNotValue, isStatus, isNotStatus, isEmptyOrNilJust, pipeFm, pipeAsyncFm, reflect
} from '../src/fonads'

const ok = Ok()
const nothing = Nothing()
const fault = Fault({op: 'testing', msg: 'fake msg'})
const justOne = Just(1)
const passthrough = Passthrough(justOne)

export default function runMonadUtilTests() {
  describe('fonad utility tests', () => {
    testFonadTypeDetection()
    testFonadify()
    testPipelines()
    testPredLists()
    testConditionLists()
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

    // not sure why I created isValue
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
  })
}

const testFonadify = () => {
  it('should fonadify correctly', () => {
    expect(isNothing(fonadify(Just()))).to.satisfy(isTruthy)
    expect(isNothing(fonadify(Just(null)))).to.satisfy(isTruthy)
    expect(isNothing(fonadify(Just([])))).to.satisfy(isTruthy)
    expect(isNothing(fonadify(Just({})))).to.satisfy(isTruthy)
    expect(isNothing(fonadify(Just('not-empty')))).to.equal(false)
    expect(fonadify(testJust)).to.equal(testJust)
    expect(fonadify(testNothing)).to.equal(testNothing)
    expect(fonadify(testFault)).to.equal(testFault)
    expect(fonadify(testOk)).to.equal(testOk)
    expect(isJust(fonadify('value'))).to.satisfy(isTruthy)
    expect(isFault(fonadify(new Error('barf')))).to.satisfy(isTruthy)
    expect(isNothing(fonadify(undefined))).to.satisfy(isTruthy)
    expect(isNothing(fonadify(null))).to.satisfy(isTruthy)
    expect(isNothing(fonadify())).to.satisfy(isTruthy)
    expect(isNothing(fonadify([]))).to.satisfy(isTruthy)
    expect(isNothing(fonadify({}))).to.satisfy(isTruthy)
    expect(extract(fonadify({}))).to.deep.equal({})
    expect(extract(fonadify([]))).to.deep.equal([])
    expect(extract(fonadify())).to.equal(null)
    expect(extract(fonadify(null))).to.equal(null)
    expect(extract(fonadify(undefined))).to.equal(null)
    expect(fonadify(testPassthrough)).to.equal(testPassthrough)
  })
}


const testPipelines = () => {

  it('should construct sync function pipelines correctly', async () => {
    expect(pipeFm(double, square, triple)(2)).to.equal(48)
    expect(pipeFm(double, square, triple)(testFault)).to.equal(testFault)
    expect(pipeFm(reflect)(testPassthrough)).to.equal(testJust)
  })

  it('should construct async function pipelines correctly', async () => {
    const noPromiseRes = pipeAsyncFm(double, square, triple)(2)
    expect(isPromise(noPromiseRes)).to.equal(true)
    expect(await noPromiseRes).to.equal(48)

    const allPromiseRes = pipeAsyncFm(asyncQuad, asyncTriple, asyncDouble)(3)
    expect(isPromise(allPromiseRes)).to.equal(true)
    expect(await allPromiseRes).to.equal(72)

    const mixedPromiseRes = pipeAsyncFm(double, asyncTriple, quad, asyncSquare)(4)
    expect(isPromise(mixedPromiseRes)).to.equal(true)
    expect(await mixedPromiseRes).to.equal(9216)

    const passthroughRes = pipeAsyncFm(asyncResolve)(testPassthrough)
    expect(isPromise(passthroughRes)).to.equal(true)
    expect(await passthroughRes).to.equal(testJust)

    const faultRes = pipeAsyncFm(asyncResolve)(testFault)
    expect(isPromise(faultRes)).to.equal(true)
    expect(await faultRes).to.equal(testFault)

    const faultPromiseRes = pipeAsyncFm(asyncResolve)(Promise.resolve(testFault))
    expect(isPromise(faultPromiseRes)).to.equal(true)
    expect(await faultPromiseRes).to.equal(testFault)
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

    // TODO:
    // faults

    // TODO:
    // throws

    // TODO:
    // rejections
  })
}


const testConditionLists = () => {

  it('should evaluate condition lists correctly', async () => {

    // hard only

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

    // pred only sync

    res = check(equals(99), 99)
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

    // pred only async

    res = check(asyncEq(99), 99)
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

    // mixed

    res = check([returnsTrue, true, returnsTrueAsync, true, asyncIsJust], Just(99))
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

    // TODO:
    // faults

    // TODO:
    // rejects

    // TODO:
    // throws

  })
}
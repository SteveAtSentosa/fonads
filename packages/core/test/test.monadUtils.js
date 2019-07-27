import { expect } from 'chai'
import { isPromise, isTruthy, isFunction } from 'ramda-adjunct'
import { isError } from '../src/utils/error'
import {
  testJust, testOk, testNothing, testFault, testPassthrough, double, triple, square, quad,
  asyncDouble, asyncTriple, asyncQuad, asyncSquare, asyncResolve, asyncReject, asyncThrow
} from './testHelpers'
import {
  Just, Ok, Fault, Nothing, Passthrough, fonadify, extract, isJust, isFault, isNothing,
  pipeFm, pipeAsyncFm, reflect, fPromisify, getExceptionMsg, addNote, getNotes
} from '../src/fonads'


const justOne = Just(1)

export default function runFonadUtilTests() {
  describe('fonad utility tests', () => {
    testFonadify()
    testFonadicPromisify()
    testPipelines()
    testValueExtraction()
    testNotes()
    testErrorUtils()
    testInstantiateClass()
  })
}

const testErrorUtils = () => {
  it('should detect errors correctly', () => {
    expect(isError('')).to.equal(false)
    expect(isError({})).to.equal(false)
    expect(isError(new Error('bang'))).to.equal(true)
  })
}

const testFonadicPromisify = () => {
  it('should wait correctly', async () => {

    const resolvedPromise = asyncResolve('resolved')
    expect(isPromise(resolvedPromise)).to.equal(true)
    const resolved = await fPromisify(resolvedPromise)
    expect(isJust(resolved)).to.satisfy(isTruthy)
    expect(extract(resolved)).to.equal('resolved')

    const rejectedPromise = asyncReject()
    expect(isPromise(rejectedPromise)).to.equal(true)
    const rejected = await fPromisify(rejectedPromise)
    expect(isFault(rejected)).to.satisfy(isTruthy)
    expect(getExceptionMsg(rejected)).to.equal('rejected')

    const thrownPromise = asyncThrow()
    expect(isPromise(thrownPromise)).to.equal(true)
    const thrown = await fPromisify(thrownPromise)
    expect(isFault(thrown)).to.satisfy(isTruthy)
    expect(getExceptionMsg(thrown)).to.equal('thrown')
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

  xit('should test actual pipelines')
}

const testValueExtraction = () => {
  it('should extract values correctly', () => {
    const testPassthrough = Passthrough(justOne)
    expect(extract(Just(3))).to.equal(3)
    expect(extract(Just(['a', 'b']))).to.deep.equal(['a', 'b'])
    expect(extract(5)).to.equal(5)
    expect(extract(['y', 'z'])).to.deep.equal(['y', 'z'])
    expect(extract(Ok())).to.equal(true)
    expect(extract(Fault())).to.equal(false)
    expect(extract(Nothing())).to.equal(null)
    expect(extract(Nothing(null))).to.equal(null)
    expect(extract(Nothing([]))).to.deep.equal([])
    expect(extract(Nothing({}))).to.deep.equal({})
    expect(isFault(Nothing({a:'b'}))).to.satisfy(isTruthy)
    expect(extract()).to.equal(undefined)
    expect(extract(null)).to.equal(null)
    expect(extract(testPassthrough)).to.equal(justOne)
    expect(extract(extract(testPassthrough))).to.equal(1)
  })
}

const testNotes = () => {
  it('should append notes correctly', () => {
    const testOk = Ok()
    const testNothing = Nothing()
    const testFault = Fault()
    const testJust = Just('testJust')
    const testPassthrough = Passthrough(justOne)

    expect(getNotes(addNote('ok note',testOk))).to.deep.equal(['ok note'])
    expect(getNotes(addNote('nothing note',testNothing))).to.deep.equal(['nothing note'])
    expect(getNotes(addNote('just note',testJust))).to.deep.equal(['just note'])
    expect(getNotes(addNote('should not save',testPassthrough))).to.deep.equal([])
    addNote('f1', testFault)
    addNote('f2', testFault)
    expect(getNotes(testFault)).to.deep.equal([ 'f2', 'f1' ])

    const justForParital = Just('just for partial')
    const addNotePartial = addNote('partial')
    expect(getNotes(addNotePartial(justForParital))).to.deep.equal(['partial'])
    expect(getNotes(addNotePartial(justForParital))).to.deep.equal(['partial', 'partial'])
  })
}


const testInstantiateClass = () => xit('should test class instantiation')

import { expect } from 'chai'
import { isPromise, isTruthy } from 'ramda-adjunct'

import { Just, isFault } from '../src/fonads'
import { extract, addNote, getExceptionMsg, getNotes } from '../src/fonads'
import { call } from '../src/fonads'

import {
  testFault, testJust, double, quad, asyncQuad, asyncTriple, asyncDouble, asyncAddNote,
  asyncResolve, asyncFault, asyncReject, asyncThrow, allGood, returnsFault, throws,
  asyncSetMe, asyncSquareMe, asyncDoubleMe, asyncTripleeMe,
  getMe, clearMe, setMe, doubleMe, squareMe, quadMe,
} from './testHelpers'


export default function runCallListTest() {
  describe('call list tests', () => {
    testCallListSync()
    testCallListAsync()
    testCallListMixed()
    testCallListOrder()
  })
}

const testCallListSync = () => {
  it('should handle call of non-async fn lists correctly', async () => {
    let just = Just(2)
    let fnList = [ addNote('1'), double, addNote('2') ]
    const faultFreeRes = call(fnList, just)
    expect(isPromise(faultFreeRes)).to.equal(true)
    expect(await faultFreeRes).to.equal(just)
    expect(getNotes(just)).to.deep.equal(['2', '1'])
    expect(extract(just)).to.equal(2)

    // fault cases

    just = Just(3)
    fnList = [ addNote('1'), returnsFault, addNote('2'), allGood, quad ]
    const faultRes = call(fnList, just)
    expect(isPromise(faultRes)).to.equal(true)
    expect(await faultRes).to.equal(testFault)
    expect(extract(just)).to.equal(3)

    fnList = [ allGood, allGood, allGood, throws ]
    const thrownRes = call(fnList, testJust)
    expect(isPromise(thrownRes)).to.equal(true)
    expect(isFault(await thrownRes)).to.satisfy(isTruthy)
    expect(getExceptionMsg(await thrownRes)).to.equal('thrown')
  })
}

const testCallListAsync = () => {
  it('should handle all async fn lists correctly', async () => {
    let just = Just(4)
    let fnList = [ asyncQuad, asyncAddNote('a-note'), asyncTriple, asyncAddNote('b-note'), asyncDouble ]
    const faultFreeRes = call(fnList, just)
    expect(isPromise(faultFreeRes)).to.equal(true)
    expect(await faultFreeRes).to.equal(just)
    expect(getNotes(just)).to.deep.equal(['b-note', 'a-note'])
    expect(extract(just)).to.equal(4)

    // fault cases

    just = Just(5)
    fnList = [ asyncFault, asyncResolve, asyncResolve ]
    const faultRes = call(fnList, just)
    expect(isPromise(faultRes)).to.equal(true)
    expect(isFault(await faultRes)).to.equal(true)
    expect(extract(just)).to.equal(5)

    just = Just(6)
    fnList = [ asyncResolve, asyncResolve, asyncThrow ]
    const thrownRes = call(fnList, just)
    expect(isPromise(thrownRes)).to.equal(true)
    expect(isFault(await faultRes)).to.satisfy(isTruthy)
    expect(getExceptionMsg(await thrownRes)).to.equal('thrown')
    expect(extract(just)).to.equal(6)

    just = Just(7)
    fnList = [ asyncResolve, asyncReject, asyncResolve ]
    const rejectedRes = call(fnList, just)
    expect(isPromise(rejectedRes)).to.equal(true)
    expect(isFault(await rejectedRes)).to.satisfy(isTruthy)
    expect(getExceptionMsg(await rejectedRes)).to.equal('rejected')
    expect(extract(just)).to.equal(7)
  })
}

const testCallListMixed = () => {
  it('should handle mixed-async fn lists correctly', async () => {
    let just = Just(44)
    let fnList = [ addNote('partner'), () => asyncResolve(88), addNote('howdy'), double ]
    const faultFree = call(fnList, just)
    expect(isPromise(faultFree)).to.equal(true)
    expect(await faultFree).to.equal(just)
    expect(extract(just)).to.equal(44)

    just = Just(55)
    fnList = [ asyncFault, asyncResolve, asyncResolve ]
    let faultRes = call(fnList, just)
    expect(isPromise(faultRes)).to.equal(true)
    expect(isFault(await faultRes)).to.equal(true)
    expect(extract(just)).to.equal(55)

    just = Just(555)
    fnList = [ double, returnsFault, asyncResolve ]
    faultRes = call(fnList, just)
    expect(isPromise(faultRes)).to.equal(true)
    expect(isFault(await faultRes)).to.equal(true)
    expect(extract(just)).to.equal(555)

    just = Just(66)
    fnList = [ asyncResolve, asyncThrow, () => asyncResolve(44) ]
    let thrownRes = call(fnList, just)
    expect(isPromise(thrownRes)).to.equal(true)
    expect(isFault(await faultRes)).to.satisfy(isTruthy)
    expect(getExceptionMsg(await thrownRes)).to.equal('thrown')
    expect(extract(just)).to.equal(66)

    just = Just(666)
    fnList = [ asyncResolve, asyncAddNote('a-note'), throws ]
    thrownRes = call(fnList, just)
    expect(isPromise(thrownRes)).to.equal(true)
    expect(isFault(await faultRes)).to.satisfy(isTruthy)
    expect(getExceptionMsg(await thrownRes)).to.equal('thrown')
    expect(extract(just)).to.equal(666)

    just = Just(77)
    fnList = [ asyncResolve, allGood, asyncReject, asyncResolve ]
    let rejectedRes = call(fnList, just)
    expect(isPromise(rejectedRes)).to.equal(true)
    expect(isFault(await rejectedRes)).to.satisfy(isTruthy)
    expect(getExceptionMsg(await rejectedRes)).to.equal('rejected')
    expect(extract(just)).to.equal(77)
  })
}

const testCallListOrder = () => {
  it('should handle order syncrhonization of fn lists correctly', async () => {

    let just3 = Just(3)

    clearMe()
    let fnList = [ asyncSetMe, asyncSquareMe, asyncDoubleMe, asyncTripleeMe ]
    let res =  call(fnList, just3)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(just3)
    expect(getMe()).to.equal(54)

    clearMe()
    fnList = [ setMe, asyncSquareMe, doubleMe, asyncTripleeMe ]
    res =  call(fnList, just3)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(just3)
    expect(getMe()).to.equal(54)

    clearMe()
    fnList = [ asyncSetMe, squareMe, asyncDoubleMe, quadMe ]
    res =  call(fnList, just3)
    expect(isPromise(res)).to.equal(true)
    expect(await res).to.equal(just3)
    expect(getMe()).to.equal(72)
  })
}


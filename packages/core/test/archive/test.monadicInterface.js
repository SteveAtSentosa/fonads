import  { expect } from 'chai'
import { isTruthy, noop } from 'ramda-adjunct'

import Ok from '../src/Ok'
import Fault from '../src/Fault'
import Nothing from '../src/Nothing'
import Just from '../src/Just'
import Passthrough from '../src/Passthrough'
import { isJust, isFault, chain, map } from '../src/fonads'

import { double ,triple ,quad } from './testHelpers'


const ok = Ok()
const nothing = Nothing()
const passthrough = Passthrough()
const fault = Fault({op: 'testing', msg: 'fake msg'})
const justOne = Just(1)


export default function runMonadicInterfaceTests() {
  describe('fonad interface tests', () => {
    testChain()
    testMap()
  })
}

const testChain = () => {
  it('should chain correctly', () => {
    expect(chain(double, justOne)).to.equal(2)
    expect(chain(double, 1)).to.equal(2)
    expect(chain(double, Just(chain(double, justOne)))).to.equal(4)
    expect(chain(double, Just(chain(double, 1)))).to.equal(4)
    expect(chain(noop, ok)).to.equal(ok)
    expect(chain(noop, fault)).to.equal(fault)
    expect(chain(noop, nothing)).to.equal(nothing)
    expect(chain(noop, passthrough)).to.equal(passthrough)
  })
}

const testMap = () => {
  it('should map correctly', () => {
    expect(isJust(map(triple, justOne))).to.satisfy(isTruthy)
    expect(map(triple, justOne)).property('_val', 3)
    expect(chain(triple, map(triple, justOne))).to.equal(9)

    expect(isJust(map(quad, 2))).to.satisfy(isTruthy)
    expect(map(quad, 2)).property('_val', 8)
    expect(chain(triple, map(quad, 2))).to.equal(24)

    expect(map(noop, fault)).to.equal(fault)
    expect(map(noop, ok)).to.equal(ok)
    expect(map(noop, nothing)).to.equal(nothing)
    expect(map(noop, passthrough)).to.equal(passthrough)
  })

  it('should convert exceptions to Fault', () => {
    const throwE = () => { throw new Error('test throw') }
    const chainFault = chain(throwE, justOne)
    expect(isFault(chainFault)).to.satisfy(isTruthy)
    const mapFault = map(throwE, justOne)
    expect(isFault(mapFault)).to.satisfy(isTruthy)
  })
}


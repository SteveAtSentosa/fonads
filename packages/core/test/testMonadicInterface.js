import  { expect } from 'chai'
import { noop } from 'ramda'

import Ok from '../src/Ok'
import Fault from '../src/Fault'
import Nothing from '../src/Nothing'
import Just from '../src/Just'
import { isJust, isFault, chain, map } from '../src/fonads'


const ok = Ok()
const nothing = Nothing()
const fault = Fault('testing', 'fake msg')
const justOne = Just(1)

export default function runMonadicInterfaceTests() {
  describe('fonad interface tests', () => {

    it('should chain correctly', () => {
      const twice = v => 2*v
      expect(chain(twice, justOne)).to.equal(2)
      expect(chain(twice, 1)).to.equal(2)
      expect(chain(twice, Just(chain(twice, justOne)))).to.equal(4)
      expect(chain(twice, Just(chain(twice, 1)))).to.equal(4)
      expect(chain(noop, ok)).to.equal(ok)
      expect(chain(noop, fault)).to.equal(fault)
      expect(chain(noop, nothing)).to.equal(nothing)
    })

    it('should map correctly', () => {
      const triple = v => 3*v
      const quad = v => 4*v

      expect(isJust(map(triple, justOne))).to.equal(true)
      expect(map(triple, justOne)).property('_val', 3)
      expect(chain(triple, map(triple, justOne))).to.equal(9)

      expect(isJust(map(quad, 2))).to.equal(true)
      expect(map(quad, 2)).property('_val', 8)
      expect(chain(triple, map(quad, 2))).to.equal(24)

      expect(map(noop, fault)).to.equal(fault)
      expect(map(noop, ok)).to.equal(ok)
      expect(map(noop, nothing)).to.equal(nothing)
    })
    it('should convert exceptions to Fault', () => {
      const throwE = () => { throw new Error('test throw') }
      const chainFault = chain(throwE, justOne)
      expect(isFault(chainFault)).to.equal(true)
      const mapFault = map(throwE, justOne)
      expect(isFault(mapFault)).to.equal(true)
      // console.log(statusMsg(mapFault))
    })
  })
}

import  { expect } from 'chai'
import { noop, pipe } from 'ramda'

import Ok from '../src/Ok'
import Fault from '../src/Fault'
import Nothing from '../src/Nothing'
import Just from '../src/Just'
import Passthrough from '../src/Passthrough'
import { isJust, isFault, chain, map, addNote, getNotes, extract, done, isPassthrough, passthroughIf } from '../src/fonads'


const ok = Ok()
const nothing = Nothing()
const passthrough = Passthrough()
const fault = Fault({op: 'testing', msg: 'fake msg'})
const justOne = Just(1)

const twice = v => 2*v
const triple = v => 3*v
const quad = v => 4*v

export default function runMonadicInterfaceTests() {
  describe('fonad interface tests', () => {

    it('should chain correctly', () => {
      expect(chain(twice, justOne)).to.equal(2)
      expect(chain(twice, 1)).to.equal(2)
      expect(chain(twice, Just(chain(twice, justOne)))).to.equal(4)
      expect(chain(twice, Just(chain(twice, 1)))).to.equal(4)
      expect(chain(noop, ok)).to.equal(ok)
      expect(chain(noop, fault)).to.equal(fault)
      expect(chain(noop, nothing)).to.equal(nothing)
      expect(chain(noop, passthrough)).to.equal(passthrough)
    })

    it('should map correctly', () => {
      expect(isJust(map(triple, justOne))).to.equal(true)
      expect(map(triple, justOne)).property('_val', 3)
      expect(chain(triple, map(triple, justOne))).to.equal(9)

      expect(isJust(map(quad, 2))).to.equal(true)
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
      expect(isFault(chainFault)).to.equal(true)
      const mapFault = map(throwE, justOne)
      expect(isFault(mapFault)).to.equal(true)
    })

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
      expect(getNotes(testFault)).to.deep.equal([ 'f1', 'f2' ])
    })

    it('should extract values correctly', () => {
      const testPassthrough = Passthrough(justOne)
      expect(extract(Just(3))).to.equal(3)
      expect(extract(Just(['a', 'b']))).to.deep.equal(['a', 'b'])
      expect(extract(5)).to.equal(5)
      expect(extract(['y', 'z'])).to.deep.equal(['y', 'z'])
      expect(extract(Ok())).to.equal(true)
      expect(extract(Fault())).to.equal(false)
      expect(extract(Nothing())).to.equal(null)
      expect(extract(testPassthrough)).to.equal(justOne)
      expect(extract(extract(testPassthrough))).to.equal(1)
      expect(extract()).to.equal(undefined)
      expect(extract(null)).to.equal(null)
    })
    it('should handle passthroughs correctly', () => {
      const cleanPassthrough = Passthrough(justOne)
      const passthroughAfterOps = pipe(
        map(twice),
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
      expect(isPassthrough(passthroughIf(isFault, justOne))).to.equal(false)
      expect(isPassthrough(passthroughIf(isFault, fault))).to.equal(true)
      expect(passthroughIf(isFault, fault)).to.not.equal(fault)
      expect(extract(passthroughIf(isFault, fault))).to.equal(fault)


    })
  })
}

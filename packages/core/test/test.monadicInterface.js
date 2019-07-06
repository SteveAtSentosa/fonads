import  { expect } from 'chai'
import { noop, pipe } from 'ramda'
import { isTruthy, isFunction } from 'ramda-adjunct'

import Ok from '../src/Ok'
import Fault from '../src/Fault'
import Nothing from '../src/Nothing'
import Just from '../src/Just'
import Passthrough from '../src/Passthrough'
import { isJust, isFault, chain, map, addNote, getNotes, extract, done, isPassthrough, passthroughIf } from '../src/fonads'

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
    testFonadOperatorMapping()
    testValueExtraction()
    testPassthrough()
    testNotes()
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

const testFonadOperatorMapping = () => {
  it('map fonad opertators correctly', () => {
    const just = Just('anything')
    const res = map(addNote('op note'), just)
    expect(res).to.equal(just)
    expect(getNotes(res)).to.deep.equal(['op note'])

    // TODO: test additional fonad operators as they come online
  })
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

const testPassthrough = () => {
  it('should handle passthroughs correctly', async () => {
    const cleanPassthrough = Passthrough(justOne)
    const passthroughAfterOps = pipe(
      map(double),
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
    expect(isPassthrough(await passthroughIf(isFault, justOne))).to.equal(false)
    expect(isPassthrough(await passthroughIf(isFault, fault))).to.satisfy(isTruthy)
    expect(await passthroughIf(isFault, fault)).to.not.equal(fault)
    expect(extract(await passthroughIf(isFault, fault))).to.equal(fault)
  })

}

const testNotes = () => {
  it('should identify itself as a fonad operator', () => {
    expect(addNote.isFonadOperator).to.equal(true)
    const partialAddNote = addNote('partial')
    expect(isFunction(partialAddNote)).to.equal(true)
    expect(partialAddNote.isFonadOperator).to.equal(true)
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
    expect(getNotes(testFault)).to.deep.equal([ 'f2', 'f1' ])

    const justForParital = Just('just for partial')
    const addNotePartial = addNote('partial')
    expect(getNotes(addNotePartial(justForParital))).to.deep.equal(['partial'])
    expect(getNotes(addNotePartial(justForParital))).to.deep.equal(['partial', 'partial'])
  })
}

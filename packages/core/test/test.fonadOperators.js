import { expect } from 'chai'
import { Just, addNote, getNotes, map } from '../src/fonads'

export default function runFonadOperatorTests() {
  describe('Fonad operator tests', () => {
    testFonadOperatorMapping()
    xit('should test all fonadic operators (id, effected fnxs, etc')
  })
}

const testFonadOperatorMapping = () => {
  it('should map fonad opertators correctly', () => {
    const just = Just('anything')
    const res = map(addNote('op note'), just)
    expect(res).to.equal(just)
    expect(getNotes(res)).to.deep.equal(['op note'])
  })
}

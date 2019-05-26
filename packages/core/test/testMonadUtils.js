import { expect } from 'chai'

import {
  Just,
  Ok,
  Fault,
  Nothing,
  isJust,
  isNothing,
  isFault,
  monadify,
} from '../src/fonads'


const testJust = Just('hanging out')
const testOk = Ok()
const testNothing = Nothing()
const testFault = Fault()
const e = new Error('barf')

export default function runMonadUtilTests() {
  describe('utility  tests', () => {
    it('should convert types correctly', () => {
      expect(monadify(testJust)).to.equal(testJust)
      expect(monadify(testNothing)).to.equal(testNothing)
      expect(monadify(testFault)).to.equal(testFault)
      expect(monadify(testOk)).to.equal(testOk)
      expect(isJust(monadify('value'))).to.equal(true)
      expect(isNothing(monadify(undefined))).to.equal(true)
      expect(isNothing(monadify(null))).to.equal(true)
      expect(isFault(monadify(new Error('barf')))).to.equal(true)
    })
  })
}

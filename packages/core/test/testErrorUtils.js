import { expect } from 'chai'

import { isError } from '../src/utils/error'


export default function runErrorUtilTests() {
  describe('error utility tests', () => {
    it('should detect errors correctly', () => {
      expect(isError('')).to.equal(false)
      expect(isError({})).to.equal(false)
      expect(isError(new Error('bang'))).to.equal(true)
    })
  })
}

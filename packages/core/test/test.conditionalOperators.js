import { expect } from 'chai'
import { equals, lt, gt } from 'ramda'
import { isPromise, isTrue, isFalse } from 'ramda-adjunct'
import {
  testJust, testOk,
  asyncResolve, returnsTrue, returnsFalse, returnsTrueAsync,
  returnsFalseAsync, asyncEq, asyncGt, asyncLt, asyncIsJust
} from './testHelpers'
import {
  Just, check, checkPredList,
  isFm, isJust, isNotJust, isNotFault, isNotFm, isOk,
} from '../src/fonads'

export default function runCondtionalOperatorTests() {
  describe('Conditional operator tests', () => {
  })
}


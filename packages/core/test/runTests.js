import runFonadTypeTests from  './test.fonadTypes'
import runFonadOperatorTests from  './test.fonadOperators'
import runMonadUtilTests from './test.monadUtils'
import runFonadInterfaceTests from './test.fonadInterface'
import runCallListTest from './test.callLists'
import runConditionalListTests from './test.conditionalLists'
import runCondtionalOperatorTests from './test.conditionalOperators.js'
import runFonadDataUtilsTests from './test.fondadDataUtils'

describe('fonad tests', () => {
  runFonadTypeTests()
  runFonadOperatorTests()
  runMonadUtilTests()
  runFonadInterfaceTests()
  runCallListTest()
  runConditionalListTests()
  runCondtionalOperatorTests()
  runFonadDataUtilsTests()
})


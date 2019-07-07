import runFonadTypeTests from  './test.fonadTypes'
import runFonadUtilTests from './test.monadUtils'
import runFonadOperatorTests from './test.fonadOperators'
import runFonadInterfaceTests from './test.fonadInterface'
import runConditionalListTests from './test.conditionalLists'
import runCondtionalOperatorTests from './test.conditionalOperators.js'

describe('fonad tests', () => {
  runFonadTypeTests()
  runFonadUtilTests()
  runFonadOperatorTests()
  runFonadInterfaceTests()
  runConditionalListTests()
  runCondtionalOperatorTests()
})


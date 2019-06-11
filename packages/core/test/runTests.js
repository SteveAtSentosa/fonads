import runErrorUtilTests from './test.errorUtils'
import runMonadUtilTests from './test.monadUtils'
import runMonadicInterfaceTests from './test.monadicInterface'
import runEnhancedInterfaceTests from './test.enhancedInterface'

describe('fonad tests', () => {
  runErrorUtilTests()
  runMonadUtilTests()
  runMonadicInterfaceTests()
  runEnhancedInterfaceTests()
})

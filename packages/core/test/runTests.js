import runErrorUtilTests from './testErrorUtils'
import runMonadUtilTests from './testMonadUtils'
import runMonadicInterfaceTests from './testMonadicInterface'
import runExtendedInterfaceTests from './testExtendedInterface'


describe('fonad tests', () => {
  runErrorUtilTests()
  runMonadUtilTests()
  runMonadicInterfaceTests()
  runExtendedInterfaceTests()
})

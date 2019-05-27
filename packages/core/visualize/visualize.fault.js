import Fault from "../src/Fault";
import { statusMsg, inspect, addNote } from '../src/fonads'

export default () => {

  const faultNoException = Fault('viz test', 'fault no exception')
  const faultWithException = Fault('viz test', 'fault with exception', new Error('exception, this could be bad'))

  console.log('\n----- visualizing Fault ------------------------------------\n')

  console.log('\n... Fault, no exception, no notes\n')
  console.log('\nstatusMsg()')
  console.log(statusMsg(faultNoException))
  console.log('\ninspect()')
  console.log(inspect(faultNoException))


  console.log('\n... Fault, no exctpion, with notes\n')
  addNote('note 1', faultNoException)
  addNote('note 2', faultNoException)
  console.log('\nstatusMsg()')
  console.log(statusMsg(faultNoException))
  console.log('\ninspect()')
  console.log(inspect(faultNoException))

  console.log('\n... Fault, with exception, no notes\n')
  console.log('\nstatusMsg()')
  console.log(statusMsg(faultWithException))
  console.log('\ninspect()')
  console.log(inspect(faultWithException))

  console.log('\n... Fault, with exception, with notes\n')
  addNote('note 1', faultWithException)
  addNote('note 2', faultWithException)
  console.log('\nstatusMsg()')
  console.log(statusMsg(faultWithException))
  console.log('\ninspect()')
  console.log(inspect(faultWithException))


  console.log('\n')
}


import Fault from '../src/Fault'
import { statusMsg, inspect, addNote } from '../src/fonads'

export default () => {
  const faultNoException = Fault({
    op: 'viz test',
    msg: 'fault no exception',
    code: "NO_E_CODE",
    clientMsg: "fire your app developer "
  })

  const faultWithException = Fault({
    op: 'viz test',
    msg: 'fault with exception',
    code: "E_CODE",
    clientMsg: "fire your app developer twice",
    e: new Error('exception, this could be bad')
  })

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

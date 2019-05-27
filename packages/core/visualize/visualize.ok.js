import Ok from "../src/Ok";
import { statusMsg, inspect, addNote } from '../src/fonads'

export default () => {

  const testOk = Ok('viz test', 'everythying is peachy')

  console.log('\n----- visualizing OK ------------------------------------\n')

  console.log('\n... OK w/o notes\n')
  console.log('\nstatusMsg()')
  console.log(statusMsg(testOk))
  console.log('\ninspect()')
  console.log(inspect(testOk))

  addNote('note 1', testOk)
  addNote('note 2', testOk)
  addNote('node 3 ', testOk)

  console.log('\n... Just with notes\n')
  console.log('\nstatusMsg()')
  console.log(statusMsg(testOk))
  console.log('\ninspect()')
  console.log(inspect(testOk))
}


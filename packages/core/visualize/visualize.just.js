import Just from "../src/Just";
import { statusMsg, inspect, addNote } from '../src/fonads'

export default () => {

  const testJust = Just({ some: 'value' })

  console.log('\n----- visualizing Just ------------------------------------\n')


  console.log('\n... Just w/o notes\n')
  console.log('\nstatusMsg()')
  console.log(statusMsg(testJust))
  console.log('\ninspect()')
  console.log(inspect(testJust))

  addNote('note 1', testJust)
  addNote('note 2', testJust)
  addNote('node 3 ', testJust)

  console.log('\n... Just with notes\n')
  console.log('\nstatusMsg()')
  console.log(statusMsg(testJust))
  console.log('\ninspect()')
  console.log(inspect(testJust))
}
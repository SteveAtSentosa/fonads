import Nothing from "../src/Nothing";
import { statusMsg, inspect, addNote } from '../src/fonads'

export default () => {

  const testNothing = Nothing()

  console.log('\n----- visualizing Nothing ------------------------------------\n')


  console.log('\n... Nothing w/o notes\n')
  console.log('\nstatusMsg()')
  console.log(statusMsg(testNothing))
  console.log('\ninspect()')
  console.log(inspect(testNothing))

  addNote('note 1', testNothing)
  addNote('note 2', testNothing)
  addNote('node 3 ', testNothing)

  console.log('\n... Nothing with notes\n')
  console.log('\nstatusMsg()')
  console.log(statusMsg(testNothing))
  console.log('\ninspect()')
  console.log(inspect(testNothing))
}
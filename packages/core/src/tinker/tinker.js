import { curry, pipe, compose } from 'ramda'
import { map, chain, inspect, ifNotFault, logMonad, Just } from '../src/fonads'


const randZeroTo100 = () => Math.floor(Math.random()*100)
const appendStr = curry((faultProbability, toAdd, cumulativeStr) => {
  console.log('~~> departing to ', toAdd);
  if ( randZeroTo100() <= faultProbability   ) {
    //console.log('... crashed on the way to ', toAdd)
    throw new Error(`TRAIN CRASH on the way to ${toAdd}`)
  }
  return cumulativeStr + " -> " + toAdd
})


console.log("\n\n----------------------------\n")

pipe(
  map(appendStr(20, 'Denver')),
  map(appendStr(20, 'Boston')),
  map(appendStr(20, 'Zimbabewe, ')),
  map(appendStr(20, 'Paradise')),
  logMonad
)('all aboard')

console.log("\n----------------------------\n\n")

const justOne = Just(1)
logMonad(justOne)
import { inspect } from 'util'
import { concat, append } from 'ramda'
import { stringify } from 'flatted/esm'

export const Just = val => {
  // if val is already an FM return it as is (don't double wrap a monad)
  if (val && val._tag && val._tag === '@@FMonad') return val
  let just = {
    _tag: '@@FMonad',
    _type: 'Just',
    _val: val,
    _notes: [],
  }
  just._this = just

  // monadic interface
  just._map = fn => Just(fn(just._val))
  just._chain = fn => fn(just._val)
  just._ap = otherMonad =>  otherMonad._map(just._val)

  // convenience fxns
  just._extract = () => just._val
  just._statusMsg = () => `All seems OK, you have a valid Just()`
  just._inspect = () => `Just(): ${stringify(just._val)}`
  just._appendNote = note => {
    just._notes = append(note, just._notes)
    return just._this
  }
  return just
}

export default Just

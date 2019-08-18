import stringify from 'json-stringify-safe'
import { msgAndNotes } from '../utils/string'
import { insertNote, setNotes } from '../utils/monadUtils'


export const Just = val => {
  // if val is already an FM return it as is (don't double wrap a monad)
  if (val && val._tag && val._tag === '@@FMonad') return val
  const just = {
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

  // extended monadic interface
  just._extract = () => just._val
  just._inspect = () => `Just(${stringify(just._val, null, 2)})`
  just._statusMsg = () => msgAndNotes('Status::Just', just._notes)
  just._setNotes = notes => setNotes(notes, just)
  just._appendNote = note => insertNote('append', note, just)
  just._prependNote = note => insertNote('prepend', note, just)
  return just
}

export default Just


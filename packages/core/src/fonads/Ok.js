import { msgAndNotes } from '../utils/string'
import { insertNote, setNotes } from '../utils/monadUtils'


export const Ok = (operation, message) => {
  const ok = {
    _tag: '@@FMonad',
    _type: 'Ok',
    _msg: `${operation}: ${message}`,
    _notes: [],
  }
  ok._this = ok

  // monadic interface
  ok._map = () => ok._this
  ok._chain = () => ok._this
  ok._ap = () => ok._this

  // convenience fxns
  ok._extract = () => true
  ok._inspect = () => `Ok(${ok._msg})`
  ok._statusMsg = () => msgAndNotes(`Status::Ok ${ok._msg}`, ok._notes)
  ok._setNotes = notes => setNotes(notes, ok)
  ok._appendNote = note => insertNote('append', note, ok)
  ok._prependNote = note => insertNote('prepend', note, ok)
  return ok
}

export default Ok



import { msgAndNotes } from './utils/string'
import { append } from 'ramda'

export const Ok = (operation, message) => {
  let ok = {
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
  ok._appendNote = note => {
    ok._notes = append(note, ok._notes)
    return ok._this
  }
  return ok
}

export default Ok



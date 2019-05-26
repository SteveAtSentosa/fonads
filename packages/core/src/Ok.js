import { arrayify } from './utils/types'
import { msgListToString } from './utils/string'
import { append, concat } from 'ramda'

export const Ok = (operation='', messages) => {
  let ok = {
    _tag: '@@FMonad',
    _type: 'Ok',
    _operation: operation,
    _notes: [],
    _msgList: messages ? [...arrayify(messages)] : [],
  }
  ok._this = ok

  // monadic interface
  ok._map = () => ok._this
  ok._chain = () => ok._this
  ok._ap = () => ok._this

  // convenience fxns
  ok._extract = () => ok._msgList
  // Not reporting notes or operaton (too much detail for success).  Maype _detailedStatusMsg in the future
  ok._statusMsg = () => msgListToString(ok._msgList)
  ok._inspect =  () => `Ok (${msgListToString(ok._msgList)})`
  ok._appendNote = note => {
    ok._notes = append(note, ok._notes)
    return ok._this
  }
  ok._appendStatusMsg = msg => {
    ok._msgList = concat(ok._msgList, arrayify(msg))
    return ok._this
  }
  return ok
}

export default Ok



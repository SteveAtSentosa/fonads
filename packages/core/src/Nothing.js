import { append } from 'ramda'
import { msgAndNotes } from './utils/string'

export const Nothing = () => {
  let nothing = {
    _tag: '@@FMonad',
    _type: 'Nothing',
    _notes: [],
  }
  nothing._this = nothing

  // monadic interface
  nothing._map = () => nothing._this
  nothing._chain = () => nothing._this
  nothing._ap = () => nothing._this

  // extended monadic interface
  nothing._extract = () => null
  nothing._inspect =  () => 'Nothing'
  nothing._statusMsg = () => msgAndNotes('Status::Nothing', nothing._notes)
  nothing._appendNote = note => {
    nothing._notes = append(note, nothing._notes)
    return nothing._this
  }
  return nothing
}

export default Nothing

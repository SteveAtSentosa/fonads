import { msgAndNotes, str } from './utils/string'
import { isEmptyOrNil } from './utils/types'
import { insertNote, setNotes } from './utils/monadUtils'
import Fault from './Fault'

// TODO add opts, similar to Just, so nates can be added upon creation
export const Nothing = (emptyOrNilVal=null) => {

  // may not be pure for one fonad type to know about another, but is pragmatic in this case
  if (!isEmptyOrNil(emptyOrNilVal))
    return Fault({ op: 'Creating Nothing', msg: `non empty value supplied: ${str(emptyOrNilVal)}` })

  let nothing = {
    _tag: '@@FMonad',
    _type: 'Nothing',
    _notes: [],
    _emptyOrNilVal: // undefined | null | [] | {}
      isEmptyOrNil(emptyOrNilVal) ? emptyOrNilVal : 'non'
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
  nothing._setNotes = notes => setNotes(notes, nothing)
  nothing._appendNote = note => insertNote('append', note, nothing)
  nothing._prependNote = note => insertNote('prepend', note, nothing)
  return nothing
}

export default Nothing

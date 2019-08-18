// Completely inert, does nothing at all
// Primarily exists prevent erroneous notes from being added to fmToPassthrough

import stringify from 'json-stringify-safe'

export const Passthrough = fmToPassthrough => {
  const passthrough = {
    _tag: '@@FMonad',
    _type: 'Passthrough',
    _fmToPassthrough: fmToPassthrough, // typically a fonad to be passed through a pipeline
    _notes: [], // never set, Passthrough is completely inerts
  }
  passthrough._this = passthrough

  // monadic interface
  passthrough._map = () => passthrough._this
  passthrough._chain = () => passthrough._this
  passthrough._ap = () => passthrough._this

  // extended monadic interface
  passthrough._extract = () => passthrough._fmToPassthrough
  passthrough._inspect = () => `Passthrough(${stringify(passthrough._fmToPassthrough, null, 2)})`
  passthrough._statusMsg = () => 'Status::Passthrough'
  passthrough._appendNote = () => passthrough._this
  passthrough._prependNote = () => passthrough._this
  passthrough._setNotes = () => passthrough._this

  return passthrough
}

export default Passthrough


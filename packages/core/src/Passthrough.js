import stringify from 'json-stringify-safe'

export const Passthrough = fmToWPassthrough => {
  let passthrough = {
    _tag: '@@FMonad',
    _type: 'Passthrough',
    _fmToWPassthrough: fmToWPassthrough, // typically a fonad to be passed through a pipeline
  }
  passthrough._this = passthrough

  // monadic interface
  passthrough._map = () => passthrough._this
  passthrough._chain = () => passthrough._this
  passthrough._ap = () => passthrough._this

  // extended monadic interface
  passthrough._extract = () => passthrough._fmToWPassthrough
  passthrough._inspect = () => `Passthrough(${stringify(passthrough._fmToWPassthrough, null, 2)})`
  passthrough._statusMsg = () => 'Status::Passthrough'
  passthrough._appendNote = () => passthrough._this
  return passthrough
}

export default Passthrough


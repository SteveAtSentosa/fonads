
export const Nothing = () => {
  let nothing = {
    _tag: '@@FMonad',
    _type: 'Nothing',
    _notes: [],
  }
  nothing._this = nothing
  nothing._map = () => nothing._this
  nothing._chain = () => nothing._this
  nothing._ap = () => nothing._this
  nothing._extract = () => null
  nothing._statusMsg = () => 'should not try to get message from Nothing' // TODO: should I throw exception here?
  nothing._inspect =  () => 'Nothing'
  return nothing
}

export default Nothing

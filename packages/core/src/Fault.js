import { append } from 'ramda'
import { msgListToString, tab } from './utils/string'
import { callStack, stackStrToArr } from './utils/error'

export const Fault = (options = {}) => {
  const { op = '', code = '', msg = '', clientMsg = '', e = null } = options
  let fault = {
    _tag: '@@FMonad',
    _type: 'Fault',
    _notes: [],
    _msg: `${op}: ${msg}`,
    _code: code,
    _clientMsg: clientMsg,
    _e: e,
    _callStack: callStack(1),
  }
  fault._this = fault

  // monadic interface
  fault._map = () => fault._this
  fault._chain = () => fault._this
  fault._ap = () => fault._this

  // extended monadic interface
  fault._extract = () => false
  fault._inspect = () => `Fault(${fault._code || fault._msg})`
  fault._statusMsg = () => statusString(fault)
  fault._appendNote = note => {
    fault._notes = append(note, fault._notes)
    return fault._this
  }
  return fault
}

//*****************************************************************************
// Helpers
//*****************************************************************************

function statusString(fault) {
  const e = fault._e
  let toReport = [`\nERROR encountered!`]
  if (fault._msg) toReport.push(tab(`Msg: ${fault._msg}`))
  if (fault._clientMsg) toReport.push(tab(`Client msg: ${fault._clientMsg}`))
  if (fault._code) toReport.push(tab(`Code: ${fault._code}`))
  if (fault._notes.length > 0) {
    toReport.push('Notes:')
    toReport.push(msgListToString(tab(fault._notes)))
  }
  if (e) {
    toReport.push('Exception Caught')
    if (e.name) toReport.push(tab(`Name: ${e.name}`))
    if (e.message) toReport.push(tab(`Message: ${e.message}`))
    if (e.code) toReport.push(tab(`Exception Code: ${e.code}`))
    if (e.stack) {
      toReport.push('Exception callstack:')
      const stackList = stackStrToArr(e.stack)
      toReport.push(msgListToString(tab(stackList)))
    }
  }
  toReport.push('App Call Stack:')
  toReport.push(msgListToString(tab(fault._callStack)))
  return msgListToString(toReport)
}
export default Fault

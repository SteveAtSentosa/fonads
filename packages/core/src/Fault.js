// TODO:
// * convert message list to message
// * don't stack faults
// * remove root cause stuff

import { concat, append } from 'ramda'
import { msgListToString, tab } from './utils/string'
import { callStack } from './utils/error'
import { arrayify } from './utils/types'

export const Fault = (operation = '', message = '', e = null) => {
  let fault = {
    _tag: '@@FMonad',
    _type: 'Fault',
    _notes: [],
    _msg: `${operation}: ${message}`,
    _e: e,
    _callStack: callStack(1)
  }
  fault._this = fault

  // monadic interface
  fault._map = () => fault._this
  fault._chain = () => fault._this
  fault._ap = () => fault._this

  // extended monadic interface
  fault._extract = () => false
  fault._inspect = () => `Fault(${fault._msg})`
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
  let toReport = [ `\nERROR encountered! ${fault._msg}\n` ]
  if (e) {
    toReport.push('Exception Caught')
    if (e.name) toReport.push(tab(`Name: ${e.name}`))
    if (e.message) toReport.push(tab(`Message: ${e.message}`))
    if (e.code) toReport.push(tab(`Code: ${e.code}`))
  }
  if (fault._notes.length > 0 ) {
    toReport.push('Notes:')
    toReport.push(msgListToString(tab(fault._notes)))
  }
  toReport.push('Call Stack:')
  toReport.push(msgListToString(tab(fault._callStack)))
  return msgListToString(toReport)
}

export default Fault

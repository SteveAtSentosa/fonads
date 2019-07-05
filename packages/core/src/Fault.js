// TODO:
// For all map functiuons, return nothing when the result isNil

import { isString } from 'ramda-adjunct'
import { msgListToStr, codeInfoOrStr, tab } from './utils/string'
import { callStack, stackStrToArr } from './utils/error'
import { insertNote, setNotes } from './utils/monadUtils'

export const Fault = (options = {}) => {
  // if options is a string, assume it the error msg
  const {
    op = '', code = '', msg = '', clientMsg = '', notes = [], e = null, here
  } =  isString(options) ? { msg: options } : options
  let fault = {
    _tag: '@@FMonad',
    _type: 'Fault',
    _notes: notes,
    _msg: codeInfoOrStr({ op, msg, here }),
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
  fault._statusMsg = () => _statusString(fault)
  fault._setNotes = notes => setNotes(notes, fault)
  fault._appendNote = note => insertNote('append', note, fault)
  fault._prependNote = note => insertNote('prepend', note, fault)

  return fault
}

//*****************************************************************************
// Helpers
//*****************************************************************************

const _statusString = fault => {
  const e = fault._e
  let toReport = [`\nERROR encountered!`]
  if (fault._msg) toReport.push(tab(`Msg: ${fault._msg}`))
  if (fault._clientMsg) toReport.push(tab(`Client msg: ${fault._clientMsg}`))
  if (fault._code) toReport.push(tab(`Code: ${fault._code}`))
  if (fault._notes.length > 0) {
    toReport.push('Notes:')
    toReport.push(msgListToStr(tab(fault._notes)))
  }
  if (e) {
    toReport.push('Exception Caught')
    if (e.name) toReport.push(tab(`Name: ${e.name}`))
    if (e.message) toReport.push(tab(`Message: ${e.message}`))
    if (e.code) toReport.push(tab(`Exception Code: ${e.code}`))
    if (e.errorNum) toReport.push(tab(`Error Num: ${e.errorNum}`))
    if (e.stack) {
      toReport.push('Exception callstack:')
      const stackList = stackStrToArr(e.stack)
      toReport.push(msgListToStr(tab(stackList)))
    }
  }
  toReport.push('App Call Stack:')
  toReport.push(msgListToStr(tab(fault._callStack)))
  return msgListToStr(toReport)
}

export default Fault


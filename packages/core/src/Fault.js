import { concat, append } from 'ramda'
import { msgListToString, tab } from './utils/string'
import { arrayify } from './utils/types'

export const Fault = (operation = '', messages = '', e = null) => {
  let fault = {
    _tag: '@@FMonad',
    _type: 'Fault',
    _rootCause: '',
    _notes: [],
    _entries: [faultEntry(operation, messages, new Error().stack, e)],
  }
  fault._this = fault

  // monadic interface
  fault._map = () => fault._this
  fault._chain = () => fault._this
  fault._ap = () => fault._this

  // convenience fxns
  fault._extract = () => inspectString(fault)
  fault._statusMsg = (prepend = '') => statusString(fault, prepend)
  // fault._inspect = () => `Fault (${inspectString(fault)})`
  fault._inspect = () => `Fault (${statusString(fault)})`
  fault._appendEntry = (operation = '', messages = '', e = null) => {
    fault._entries = append(
      faultEntry(operation, messages, new Error().stack, e),
      fault._entries,
    )
    return fault._this
  }
  fault._setRootCause = rootCause => (fault._rootCause = rootCause)
  fault._appendNote = note => {
    fault._notes = append(note, fault._notes)
    return fault._this
  }
  fault._exceptionList = () =>
    fault._entries.reduce(
      (eList, curEntry) =>
        curEntry.exception ? append(curEntry.exception, eList) : eList,
      [],
    )

  return fault
}

//*****************************************************************************
// Helpers
//*****************************************************************************

function faultEntry(operation = '', messages = '', callStack = '', e = null) {
  return {
    operation,
    msgList: arrayify(messages),
    callStack,
    exception: e,
  }
}

function faultEntryMsg(entry) {
  const e = entry.exception
  let toReport = [`\nERROR encountered: ${entry.operation}`, ...tab(entry.msgList)]
  if (e) {
    toReport.push('Exception Caught')
    if (e.name) toReport.push(tab(`Name: ${e.name}`))
    if (e.message) toReport.push(tab(`Message: ${e.message}`))
    if (e.code) toReport.push(tab(`Code: ${e.code}`))
  }
  toReport.push(`Call Stack:\n${tab(entry.callStack)}\n`)
  return msgListToString(toReport)
}

function statusString(fault, prepend = '') {
  const faultNotes = fault._rootCause
    ? [`ROOT CAUSE: ${fault._rootCause}`, ...fault._notes]
    : fault._notes
  // const rootCauseStr = fault._rootCause ? `Root Cause: ${fault._rootCause}\n` : ''
  const notesStr =
    faultNotes.length > 0 ? `${msgListToString(['\nFault:', ...tab(faultNotes)])}\n` : ''
  const errStr = fault._entries.reduce(
    (outString, curEntry) => concat(outString, faultEntryMsg(curEntry)),
    prepend ? `${prepend}\n` : '',
  )
  return concat(notesStr, errStr)
}

function inspectString(fault) {
  fault._entries.reduce(
    (outString, curEntry) => concat(outString, msgListToString(curEntry.msgList)),
    '',
  )
}

export default Fault

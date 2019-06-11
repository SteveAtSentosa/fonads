import { last, drop } from 'ramda'
import { arrayify } from './types'
import { msgListToString, tab } from './string'

// return line number of the module where this is callsed
export const lineNum = () => new Error().stack.split('\n')[2]

// return the file, function and lineNum and stack at which this fxn is called
export const here = () => {
  const stackRow = new Error().stack.split('\n')[2].trim()
  return {
    file: last(
      stackRow
        .split(':')[0]
        .split(' ')[2]
        .replace('(', '')
        .split('/'),
    ),
    fn: stackRow.split(':')[0].split(' ')[1],
    line: Number(stackRow.split(':')[1].trim()),
    stack: callStack(1),
  }
}

export const raisedHere = here
export const raisedHereStr = () => {
  const raisedInfo = raisedHere()
  return `File: ${raisedInfo.file}, Function: ${raisedInfo.function}, line ${raisedInfo.lineNum}`
}

const isHere = here => here && here.file && here.line && here.fn && here.stack

export const hereStr = here => isHere(here) ?
` at ${here.file} | line ${here.line} | ${here.fn}()` /* + msgListToString(tab(here.stack), '\n') */ : ''

export const isError = e => e instanceof Error

// Given a error message or list of error messages ('' | ['']), and an optional
// Error(), create a single error string.
export const errString = (msgOrMsgList, e = null) => {
  let msgList = arrayify(msgOrMsgList)
  if (e && e.name) msgList.push(`Error Name: ${e.name}`)
  if (e && e.message) msgList.push(`Error Messages: ${e.message}`)
  if (e && e.code) msgList.push(`Error Code: ${e.code}`)
  return msgListToString([
    '\nERROR encountered:',
    ...tab(msgList),
    `Call Stack:\n    ${new Error().stack}`,
  ]) // return callers stack
}

// throw an error message if condition is true
// a -> '' | ['']
export const throwIf = (condition, msg) => {
  if (condition) throw new Error(errString(msg))
}

// apply predicate to value,
// if result is truthy throw an Error obj with the supplied message, otherwise return the value
export const throwIfP = (predicate, value, msg) => {
  throwIf(predicate(value), msg)
  return value
}

// Return call stack as an array of strings
export const callStack = (skip = 0) => {
  const stackStr = new Error().stack
  const stackArr = stackStr.split('\n').map(s => s.trim())
  // skip 'Error" entry, and entry for this call at the very least
  return drop(skip + 2, stackArr)
}


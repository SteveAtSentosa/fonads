import { concat } from 'ramda'
import { isString } from 'ramda-adjunct'
import { isNotStringArray, isStringArray, arrayify } from './types'
import stringify from 'json-stringify-safe'


// export const json = v => JSON.stringify(v, null, 2)
export const json = v => stringify(v, null, 2)
export const str = v => stringify(v)

// given a string or array of strings, prepended with the specified tab
// (['']|'', '') -> [''] | ''
export const tab = (tabMe='', tab='    ') => {
  if (isStringArray(tabMe)) return tabMe.map(str => `${tab}${str}`)
  else if (isString(tabMe)) return `${tab}${tabMe}`
  else return tabMe
}

// Given a message or message list ('' | ['']) return a single composite string
// if isStringArray(mgsStack), \n is appended to all entries except the last.
// Preceed each string in `msgList` with `pre` if provided
// Append result to `appendTo` if provided, with no \n inbetween
// '' | ['']  -> '' -> -> '' -> ''
export const msgListToStr = (msgList, appendTo='', pre='') => {
  const strings = arrayify(msgList)
  if (isNotStringArray(strings)) return appendTo
  return msgList.reduce((acc, cur, i) =>
    concat(acc, `${pre}${cur}${i<strings.length-1?'\n':''}`), appendTo/* appendTo?`${appendTo}\n`:''*/ )
}

// Given a msg string, and an array of notes, return a single string
// TBD more docs
export const msgAndNotes = (msg, notes) => msgListToStr(
  concat([msg], tab(notes))
)

const isHere = here => here && here.file && here.line && here.fn && here.stack

export const hereStr = here => isHere(here) ?
` at ${here.file} | line ${here.line} | ${here.fn}()` /* + msgListToStr(tab(here.stack), '\n') */ : ''

// info = 'msg' | { op, msg, code, here }
export const codeInfoOrStr = codeInfo =>  {
  const { op = '', msg = '', code = '', here } = isString(codeInfo) ? { msg: codeInfo } : codeInfo
  return `${code ? 'Code '+code+':, ' : ''}${op ? op+': ' : ''}${msg}${here ? hereStr(here) : ''}`
}


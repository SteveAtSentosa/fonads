import { complement, concat } from 'ramda'
import { isString } from 'ramda-adjunct'
import { isNotStringArray, isStringArray, arrayify } from './types'

export const json = v => JSON.stringify(v, null, 2)

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
export const msgListToString = (msgList, appendTo='', pre='') => {
  const strings = arrayify(msgList)
  if (isNotStringArray(strings)) return appendTo
  return msgList.reduce((acc, cur, i) =>
    concat(acc, `${pre}${cur}${i<strings.length-1?'\n':''}`), appendTo/* appendTo?`${appendTo}\n`:''*/ )
}

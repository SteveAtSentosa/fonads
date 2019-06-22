import { prop } from 'ramda'
import { Nothing } from '@fonads/core'
import { pipeAsync, isNotFault, capture, switchTo, logStatus, logMsg, logIf, logMsgIf, mapTo } from '@fonads/core'
import { openConnection, dropDatabase, createDatabase, useDatabase, createCollection, getDocByIdOrKey, insertDoc } from './src/farango'

const tinkerDoc = {
  _key: 'dupio',
  name: 'tinker',
  action: 'oioioi',
}

const docKey = Nothing()
const connection = Nothing()
const collection = Nothing()

pipeAsync(
  logMsg('\n... opening server connection'),
  openConnection('local', 'root'),
  capture(connection),

  logMsgIf(isNotFault, '\n... creating database'),
  createDatabase('dbtest'),

  logMsgIf(isNotFault, '\n... creating collection'),
  useDatabase('dbtest'),
  createCollection('testCollection'),
  capture(collection),

  logMsgIf(isNotFault, '\n... inserting document into collection'),
  insertDoc(tinkerDoc),
  logIf(isNotFault),
  mapTo(prop('_key'), docKey),

  logMsgIf(isNotFault, '\n... querying the doc that was just inserted'),
  switchTo(collection),
  getDocByIdOrKey(docKey),
  logIf(isNotFault),

  logMsgIf(isNotFault, '\n... deleting database'),
  switchTo(connection),
  dropDatabase('dbtest'),

  logMsg('\nDONE'),
  logStatus,
)('pw')

import { prop } from 'ramda'
import { Nothing } from '@fonads/core'
import { pipeAsync, isNotFault, capture, switchTo, logStatus, logMsg, logIf, logMsgIf, faultIf, mapTo, isNothing, h, extract, addNoteIf, isFault } from '@fonads/core'
import { openConnection, dropDatabase, createDatabase, useDatabase, createCollection, getDocByIdOrKey, insertDoc, aqlQuery } from '../src/farango'
import { aql } from 'arangojs';
import { log, logWithMsg, logStatusWithMsg } from '@fonads/core'

const tinkerDoc = {
  name: 'tinker',
  action: 'oioioi',
}

const use = true
const graceful = true

const dbName = 'stest'
const collectionName = 'testCollection'
const docKey = Nothing()
const connection = Nothing()
const collection = Nothing()

const go = () =>
  pipeAsync(

    logMsg('\n... opening server connection'),
    openConnection('root', 'pw'),
    capture(connection),

    logMsgIf(isNotFault, '\n... dropping database if it exists'),
    switchTo(connection),
    dropDatabase('stest', { graceful }),

    logMsgIf(isNotFault, '\n... creating database'),
    createDatabase(dbName, { use, graceful }),

    logMsgIf(isNotFault, '\n... creating collection'),
    createCollection(collectionName, { graceful }),
    capture(collection),

    logMsgIf(isNotFault, '\n... inserting document into collection'),
    insertDoc(tinkerDoc),
    mapTo(prop('_key'), docKey),
    logIf(isNotFault),

    logMsgIf(isNotFault, '\n... querying the doc that was just inserted by key'),
    switchTo(collection),
    getDocByIdOrKey(docKey, { graceful }),
    faultIf(isNothing, { msg: `Doc not found`, here:h() }),
    logIf(isNotFault),

    logMsgIf(isNotFault, '\n... querying doc that was just inserted via aql'),
    switchTo(connection),
    connection => aqlQuery(aql`FOR d in ${extract(collection)} FILTER d.name == "tinker" return d`, connection),
    logIf(isNotFault),

    switchTo(connection),
    logMsgIf(isNotFault, '\n... invalid aql query'),
    aqlQuery('FOR d in testCollection FILTER d.name == "tinkr" return d'),
    logIf(isNotFault),

    logMsg('\nDONE'),
    logStatus,
  )('local')

const doit = async () => {
  await go()
}

doit()


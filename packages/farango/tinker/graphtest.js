import { prop } from 'ramda'
import { Nothing } from '@fonads/core'
import { pipeAsync, isNotFault, capture, switchTo, logStatus, logMsg, logIf, logMsgIf, faultIf, mapTo, isNothing, h, pta } from '@fonads/core'
import { openConnection, dropDatabase, createDatabase, useDatabase, createCollection, getDocByIdOrKey, insertDoc, aqlQuery } from '../src/farango'
import { aql } from 'arangojs';
import { log } from '@fonads/core'
















const tinkerDoc = {
  name: 'tinker',
  action: 'oioioi',
}

const docKey = Nothing()
const connection = Nothing()
const collection = Nothing()
const use = true
const graceful = true

const go = () =>
  pipeAsync(
    logMsg('\n... opening server connection'),
    openConnection('root', 'pw'),
    capture(connection),

    logMsgIf(isNotFault, '\n... creating database'),
    createDatabase('gtest', { use, graceful }),

    // logMsgIf(isNotFault, '\n... creating collections'),
    // pta(createCollection('users')),
    // pta(createCollection('roles')),
    // pta(createCollection('privileges')),
    // log,

    // createCollection('testCollection'),
    // capture(collection),

    // logMsgIf(isNotFault, '\n... inserting document into collection'),
    // insertDoc(tinkerDoc),
    // mapTo(prop('_key'), docKey),
    // logIf(isNotFault),

    // logMsgIf(isNotFault, '\n... querying the doc that was just inserted by key'),
    // switchTo(collection),
    // getDocByIdOrKey(docKey, false),
    // faultIf(isNothing, { msg: `Doc not found`, here:h() }),
    // logIf(isNotFault),

    // logMsgIf(isNotFault, '\n... directly querying doc that was just inserted via aql'),
    // switchTo(connection),
    // aqlQuery('FOR d in testCollection FILTER d.name == "tinker" return d'),
    // logIf(isNotFault),

    // logMsgIf(isNotFault, '\n... defered querying doc that was just inserted via aql'),
    // switchTo(connection),

    // // this works
    // connection => aqlQuery(aql`FOR d in ${extract(collection)} FILTER d.name == "tinker" return d`, connection),
    // // aqlQueryF(aql`FOR d in ${extract(collection)} FILTER d.name == "tinker" return d`),
    // logIf(isNotFault),

    // // switchTo(connection),
    // // logMsgIf(isNotFault, '\n... invalid aql query'),
    // // switchTo(connection),
    // // aqlQuery('FOR d in testCollection FILTER d.name == "tinkr" return d'),
    // // logIf(isNotFault),

    // logMsgIf(isNotFault, '\n... deleting database'),
    // switchTo(connection),
    // dropDatabase('gtest'),

    logMsg('\nDONE'),
    logStatus,
  )('local')

const doit = async () => {
  await go()
}

doit()


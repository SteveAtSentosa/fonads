import { Nothing } from '@fonads/core'
import { pipeAsync, isNotFault,capture, switchTo, log, logFm, logWithMsg, logStatus, logMsg, logMsgIf, logMsgOnNonFault, logFmWithMsg, logValWithMsg, toStatus, ptAsycn } from '@fonads/core'
import { openConnection, dropDatabase, aqlQuery, createDatabase, useDatabase, createCollection, insertDocIntoCollection } from './src/farango'
// TODO: implement NothingToJust, and use nothing below

const tinkerDoc = {
  name: 'tinker',
  action: 'bro insert'
}

const db = Nothing() // TODO: convert to aServer
pipeAsync(
  logMsg('... opening server connection'),
  openConnection('local', 'root'),
  logMsgIf(isNotFault, '... creating database'),
  createDatabase('dbtest'),
  // capture(db), // if everything does PT, may not need to use capture here ... eventually make this work

  // logMsgOnNonFault('... creating collection'),
  // useDatabase('dbtest'),
  // createCollection('testCol'),
  // logMsgOnNonFault('... inserting document into collection'),
  // insertDocIntoCollection(tinkerDoc),
  // switchTo(db),
  // logMsgOnNonFault('... querying doc'),
  // aqlQuery('FOR d in testCol FILTER d.name == "tinker" return d'),
  // logFm,

  // // clean up
  // logMsg('\n--- clean up ----------------------------------------------\n'),
  // logMsg('... deleting database'),
  // switchTo(db),
  // useDatabase('_system'), // TODO: put this in dropDatabase Fn
  // dropDatabase('dbtest'),
  // toStatus, logFm,
  logMsg('\nDONE\n'),
  logStatus,
)('pw')

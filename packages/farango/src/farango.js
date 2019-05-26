// TODO:
// * better documentation

import { curry } from 'ramda'
import { Database, aql } from 'arangojs'
import { Ok, Just, Fault } from '@fonads/core'
import { isFault, isNonJustFm, value } from '@fonads/core'
import { caseOf, orElse } from '@fonads/core'
import { mapMethod, mapMethodPT, mapMethodIfConditionPT, mapAsyncMethod, mapAsyncMethodPT, propagateOnJust } from '@fonads/core'
import { pipeAsync, instantiate, reflect, here } from '@fonads/core'
import { addNoteIfFault, setRootCauseIfFault, logFm, log, logFmWithMsg } from '@fonads/core'

const defaultServerUrl = 'http://127.0.0.1:8529'
const resolveUrl = url => (url === 'local' ? defaultServerUrl : url)

// open a connection do arango server
// To connect to lcoal server, pass serverUrl as 'local'
// 'url' -> 'un' -> 'pw' -> J(arangoServerConnection) | F
export const openServerConnection = async (url = 'local', un = 'root', pw = '') =>
  pipeAsync(
    resolveUrl,
    instantiate('arrango Database', Database),
    mapMethodIfConditionPT(un && pw, 'useBasicAuth', [un, pw]),
    _checkArangoServerConnection,
    addNoteIfFault(`Unable to open connection to arango server at url: ${resolveUrl(url)}`, here()),
    addNoteIfFault(`Server may not be running, URL may be incorrect, or un/pw may be incorrect: `, here())
  )(url)

// Create a database
// TODO: Test that this curry / asycn approach really works
//       If so, fonads:mapAsyncMethod can be converted to this approach
//       WHY do I have asycn here ?????  probably has to do with curring and partial arhuments, and asycn
// Also, if DB already exists, just return it
export const createDatabase = curry(async (name, $db) =>
  pipeAsync(
    mapAsyncMethod('createDatabase', name),
    setRootCauseIfFault(`Unable to create database named '${name}'`, here()),
    propagateOnJust($db),
  )($db)
)


export const aqlQuery1 = curry(async (query, $db) => {
  logFm($db)
  const db = value($db)
  // const cursor = await db.query(query)
  // console.log('cursor: ', cursor)
  // const results = await cursor.all()
  // console.log('results: ', results)
  // return Just(results)
})

// export const aqlQuery2 = curry(async (query, $db) => {
//   console.log('~~> aqlQuery2()');
//   return pipeAsync(
//     log,
//     mapAsyncMethod('query', query),
//     log,
//     mapAsyncMethod('all', []),
//     log,
//     // logFm,
//     // addNoteIfFault(`Unable to execute aql query: '${query}'`, here()),
//   )($db)

// })


export const aqlQuery2 = curry(async (query, $db) =>
  pipeAsync(
    mapAsyncMethod('query', query),
    mapAsyncMethod('all', []),
    // addNoteIfFault(`Unable to execute aql query: '${query}'`, here()),
  )($db)
)



export const aqlQuery = aqlQuery2

// TODO: createDatabaseIfDoesNotExist()

// Drop a database
export const dropDatabase = curry(async (name, $db) =>
  pipeAsync(
    mapAsyncMethod('dropDatabase', name),
    addNoteIfFault(`Unable to drop database named '${name}'`, here()),
    propagateOnJust($db),
  )($db)
)

// TODO: dropDatabaseIfExists()

// Use a database
export const useDatabase = curry(async (name, $db) =>
  pipeAsync(
    mapMethod('useDatabase', name),
    setRootCauseIfFault(`Unable to use database named '${name}'`, here()),
    propagateOnJust($db),
  )($db)
)

// TODO: check for collection existance
// TODO: cache collection handles?  see fu2 backend


// export const createCollection = curry((collectionName, $db) =>
//   pipeAsync(

//     // mapMethod('useDatabase', name),
//     // setRootCauseIfFault(`Unable to use database named '${name}'`, here()),
//     // propagateOnJust($db),
//   )($db)


// create collection within provided $db
export const createCollection = curry(async (name, $db) =>
  pipeAsync(
    mapMethod('collection', name),
    mapAsyncMethodPT('create', null),
    setRootCauseIfFault(`Unable to get collection '${name}'`, here()),
  )($db)
)

// Returns handle to specified collection name.
// If collection does not exist, it is created
export const getCollection = curry(async (name, $db) =>
  pipeAsync(
    mapMethod('collection', name),
    setRootCauseIfFault(`Unable to get collection '${name}'`, here()),
  )($db)
)

export const insertDocIntoCollection = curry(async (doc, $collection) =>
  pipeAsync(
    mapAsyncMethod('save', doc),
    // logFmWithMsg('----- after doc insert'),
    addNoteIfFault(`Unable to insert doc into collection: `, here()) // TODO: convert to colelction name ?
  )($collection)
)



// export const insertDocIntoCollection = curry((doc, $collection) =>
//   pipeAsync(
//     mapMethod('save', doc),
//     addNoteIfFault(`Unable to insert doc into collection: `, here()) // TODO: convert to colelction name ?
//   )($collection)

//*************************************************************************************************
// Helper fxns
//*************************************************************************************************

// Check an arango server connection [ FOP ]
// Return F if connection is not valid, otherwise reflect $arangoServer
// $asc | Just($asc) -> P[ J($asc) | Fault ]
const _checkArangoServerConnection = async $arangoServer =>
  pipeAsync(
    mapAsyncMethod('query', aql`RETURN ${Date.now()}`),
    mapAsyncMethod('next', null),
    setRootCauseIfFault('Unable to connect to arangodb server', here()),
    propagateOnJust(Just($arangoServer)),
  )($arangoServer)

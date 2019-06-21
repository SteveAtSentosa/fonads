import { curry, mergeLeft } from 'ramda'
import { Database, aql } from 'arangojs'
import stringify from 'json-stringify-safe'
import { Ok, Just, Fault } from '@fonads/core'
import { isFault, isNonJustFm, value } from '@fonads/core'
import { caseOf, orElse } from '@fonads/core'
import { log, logRaw, logMsg, logWithMsg, addNoteIf, addTaggedNoteIf, returnIf, done } from '@fonads/core'
import { mapMethod, callMethod, callMethodIf, mapWithArgs, mapAsyncMethod, map, propagate, extract } from '@fonads/core'
import { pipeAsync, instantiateClass, reflect, here } from '@fonads/core'
// import { addNoteIfFault, setRootCauseIfFault, logFm, log, logFmWithMsg } from '@fonads/core'




// TODO: make all args $ (fm or val)
// * Tinker again with the idea of a passthrough monad
// * make and x = extract, for better shorthand

const defaultServerUrl = 'http://127.0.0.1:8529'

// openConnection
//   open a connection to arango server
//   To connect to lcoal server, pass url as 'local'
//   'url' -> 'un' -> 'pw' -> J(arangoServerConnection) | F
export const openConnection = curry(async (url , un , pw) =>
  pipeAsync(
    _makeConnectionOptions,
    instantiateClass('arrango Database', Database),
    _applyCredsToConnection(un, pw),
    _validateConnection,
    addTaggedNoteIf(isFault, `Unable to connect to arango server w these options: ${stringify(_makeConnectionOptions(url))}`, here()),
    addNoteIf(isFault, 'Server may not be running, URL may be incorrect, or un/pw may be incorrect'),
  )(url))

// generates arrango server connections options object
const _makeConnectionOptions = url => ({
  url: url === 'local' ? defaultServerUrl : url
})

// apply un/pw to db server connection
// {arangoDbConnection} -> {arangoDbConnection}
const _applyCredsToConnection = curry((un, pw, $connection) =>
  callMethodIf(un && pw, 'useBasicAuth', [un, pw], $connection))

// Check an arango server connection (FOP)
//   Return F if connection is not valid, otherwise reflect $arangoServer
//   $connection | Just($connection) -> P[ J($connection) | Fault ]
const _validateConnection = async $connection =>
  pipeAsync(
    mapAsyncMethod('query', aql`RETURN ${Date.now()}`),
    mapAsyncMethod('next', null),
    propagate($connection),
  )($connection)


// createDatabase (FOP)
// 'dbName' -> $connection | J($connection) -> J($connection) | F
export const createDatabase = curry(async ($dbName, $connection) => {
  if (isNonJustFm($connection)) return $connection
  return pipeAsync(
    mapAsyncMethod('createDatabase', extract($dbName)),
    addTaggedNoteIf(isFault, `Unable to create database ${extract($dbName)}`, here()),
    propagate($connection),
  )($connection)
})

export const createDatabase2 = curry(async ($dbName, $connection) =>
  pipeAsync(
    returnIf(isNonJustFm),
    logWithMsg('after returnIf'),
    mapAsyncMethod('createDatabase', extract($dbName)),
    addTaggedNoteIf(isFault, `Unable to create database ${extract($dbName)}`, here()),
    propagate($connection), done
  )($connection))


// Use a database (FOP)
//   'dbName' -> $connection | J($connection) -> J($connection) | F
export const useDatabase = curry(async ($dbName, $connection) => {
  if (isNonJustFm($connection)) return $connection
  const dbName = extract($dbName)
  return pipeAsync(
    mapMethod('useDatabase', dbName),
    addTaggedNoteIf(isFault, `Unable to use database ${dbName}`, here()),
    propagate($connection),
  )($connection)
})

// createCollection
//   '$collectionName' -> {$connection} -> J({$connection}) | F
export const createCollection = curry(async ($collectionName, $connection) => {
  const collectionName = extract($collectionName)
  if (isNonJustFm($connection)) return $connection
  return pipeAsync(
    mapMethod('collection', collectionName),
    callMethod('create', []),
    addTaggedNoteIf(isFault, `Unable to create collection ${collectionName}`, here()),
  )($connection)
})

// createCollection (NJR)
//   '$collectionName' -> {$connection} -> J({$connection}) | F
export const createCollection2 = curry(async ($collectionName, $connection) =>
  pipeAsync(
    returnIf(isNonJustFm),
    log,
    mapMethod('collection', extract($collectionName)),
    callMethod('create', []),
    addTaggedNoteIf(isFault, `Unable to create collection ${extract($collectionName)}`, here()),
    done
  )($connection)
)


// insertDoc
// {doc} -> {$collection} | J($collection) -> J(doc-with-key-and-id-added)
export const insertDoc = curry(async (doc, $collection) => {
  if (isNonJustFm($collection)) return $collection
  return pipeAsync(
    mapAsyncMethod('save', doc),
    map(mergeLeft(doc)),
    addTaggedNoteIf(isFault, `Unable to insert doc`, here()),
  )($collection)
})

// getDocByIdOrKey
export const getDocByIdOrKey = curry(async ($idOrKey, $collection) => {
  if (isNonJustFm($collection)) return $collection
  return pipeAsync(
    mapAsyncMethod('document', extract($idOrKey)),
    addTaggedNoteIf(isFault, `Unable to query doc with id or key of '${extract($idOrKey)}'`, here()),
  )($collection)
})

// dropDatabase
//   '$name' => {$connection} -> J({$connection}) | F
export const dropDatabase = curry(async ($name, $connection) => {
  if (isNonJustFm($connection)) return $connection
  const name = extract($name)
  return pipeAsync(
    useDatabase('_system'),
    mapAsyncMethod('dropDatabase', name),
    addTaggedNoteIf(isFault, `Unable to drop database named '${name}'`, here()),
    propagate($connection),
  )($connection)
})

// export const aqlQuery1 = curry(async (query, $db) => {
//   logFm($db)
//   const db = value($db)
//   // const cursor = await db.query(query)
//   // console.log('cursor: ', cursor)
//   // const results = await cursor.all()
//   // console.log('results: ', results)
//   // return Just(results)
// })

// // export const aqlQuery2 = curry(async (query, $db) => {
// //   console.log('~~> aqlQuery2()');
// //   return pipeAsync(
// //     log,
// //     mapAsyncMethod('query', query),
// //     log,
// //     mapAsyncMethod('all', []),
// //     log,
// //     // logFm,
// //     // addNoteIfFault(`Unable to execute aql query: '${query}'`, here()),
// //   )($db)

// // })

// export const aqlQuery2 = curry(async (query, $db) =>
//   pipeAsync(
//     mapAsyncMethod('query', query),
//     mapAsyncMethod('all', []),
//     // addNoteIfFault(`Unable to execute aql query: '${query}'`, here()),
//   )($db)
// )

// export const aqlQuery = aqlQuery2

// // TODO: createDatabaseIfDoesNotExist()

// // Drop a database
// export const dropDatabase = curry(async (name, $db) =>
//   pipeAsync(
//     mapAsyncMethod('dropDatabase', name),
//     addNoteIfFault(`Unable to drop database named '${name}'`, here()),
//     propagateOnJust($db),
//   )($db)
// )

// // TODO: dropDatabaseIfExists()

// // TODO: check for collection existance
// // TODO: cache collection handles?  see fu2 backend

// // export const createCollection = curry((collectionName, $db) =>
// //   pipeAsync(

// //     // mapMethod('useDatabase', name),
// //     // setRootCauseIfFault(`Unable to use database named '${name}'`, here()),
// //     // propagateOnJust($db),
// //   )($db)


// // Returns handle to specified collection name.
// // If collection does not exist, it is created
// export const getCollection = curry(async (name, $db) =>
//   pipeAsync(
//     mapMethod('collection', name),
//     setRootCauseIfFault(`Unable to get collection '${name}'`, here()),
//   )($db)
// )

// export const insertDocIntoCollection = curry(async (doc, $collection) =>
//   pipeAsync(
//     mapAsyncMethod('save', doc),
//     // logFmWithMsg('----- after doc insert'),
//     addNoteIfFault(`Unable to insert doc into collection: `, here()) // TODO: convert to colelction name ?
//   )($collection)
// )

// // export const insertDocIntoCollection = curry((doc, $collection) =>
// //   pipeAsync(
// //     mapMethod('save', doc),
// //     addNoteIfFault(`Unable to insert doc into collection: `, here()) // TODO: convert to colelction name ?
// //   )($collection)

//*************************************************************************************************
// Helper fxns
//*************************************************************************************************

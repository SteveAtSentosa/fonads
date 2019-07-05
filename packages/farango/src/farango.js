import { curry, mergeLeft, prop } from 'ramda'
import { isTrue, isFalse } from 'ramda-adjunct'
import { Database, aql } from 'arangojs'
import { addNote, addNoteIf, isNothing, capture, addErrCode, callIf, callOnFault, returnIf, isFault, isJust, reflect } from '@fonads/core'
import { Nothing, Just, Fault } from '@fonads/core'
import { mapMethod, callAsyncMethod, callMethodIf, map, chain, propagate, extract, caseOf, orElse } from '@fonads/core'
import { fEq, fIncludes, fProp, fStr } from '@fonads/core'
import { pipeAsyncFm, pipeFm, instantiateClass, h } from '@fonads/core'
import { log, logRaw, logMsg, logWithMsg, logValWithMsg } from '@fonads/core'
import { ec } from './error'

const defaultServerUrl = 'http://127.0.0.1:8529'

const graceful = true

console.log('mapMethod: ', mapMethod)
// TODO:
// * I probably can remove asycn fn prependers wheenver returning resuilt of pipeAsycnFm
// * add active database from connection where appropriate


// openConnection [ asycn ]
//   open a connection to arango server
//   To connect to lcoal server, pass url as 'local'
//   '$url' -> '$un' -> '$pw' -> J({connection}) | F
export const openConnection = curry(async ($un, $pw, $url) =>
  pipeAsyncFm(
    _makeConnectionOptions,
    instantiateClass('arrango Database', Database),
    _applyCredsToConnection($un, $pw),
    _validateConnection,
    callOnFault([
      addErrCode(ec.FARANGO_CANT_OPEN_CONNECTION),
      addNote('Server may not be running, URL may be incorrect, or un/pw may be incorrect'),
      addNote({ msg: `Unable to connect to arango server w these options: ${fStr(_makeConnectionOptions($url))}`, here: h() }),
    ]),
  )($url),
)

// generates arrango server connections options object
const _makeConnectionOptions = $url => ({
  url: fEq($url, 'local') ? defaultServerUrl : extract($url),
})

// _applyCredsToConnection [asycn, reflective]
//   apply un/pw to db server connection
//   '$un' -> 'pw' -> $connection -> $connection
const _applyCredsToConnection = curry(($un, $pw, $connection) =>
  callMethodIf($un && $pw, 'useBasicAuth', [$un, $pw], $connection))

// _validateConnection [asycn, reflective]
//   Check an arango server connection
//   $connection -> P($connection | F)
const _validateConnection = async $connection =>
  pipeAsyncFm(
    mapMethod('query', aql`RETURN ${Date.now()}`),
    mapMethod('next', null),
    propagate($connection))
  ($connection)

export const databaseExists = curry(async ($dbName, $connection) =>
  pipeAsyncFm(
    mapMethod('listDatabases', []),
    fIncludes($dbName))
  ($connection))

const _isGraceful = $opts => !!fProp('graceful', $opts)

// createDatabase [asycn, reflective]
//   given a conneciton, create a dataBase
//   opts {
//     use:      bool // use the DB after creating
//     graceful: bool // if db already exists, do not report error
//   }
//   '$dbName' $connection -> P($connection | F )
export const createDatabase = curry(async ($dbName, $opts, $connection) =>
  pipeAsyncFm(
    // returnIf(fProp('graceful', $opts) && databaseExists($dbName)), // IF i get the fancy pred checker working
    // returnIf(_isGraceful($opts) && (await databaseExists($dbName, $connection))), <----------- not working with current pred structure
    // logWithMsg('returnIf'),
    mapMethod('createDatabase', extract($dbName)),
    propagate($connection),
    callIf(fProp('use', $opts), useDatabase($dbName)),
    callOnFault([addErrCode(ec.FARANGO_CANT_CREATE_DB), addNote({ msg: `Unable to create database '${extract($dbName)}'`, here: h() })]),
  )($connection),
)

// useDatabase [reflective]
// Given a conneciton, use a database (i.e. make active)
// 'dbName' -> $connection -> $connection | F
export const useDatabase = curry(($dbName, $connection) =>
  pipeFm(
    mapMethod('useDatabase', extract($dbName)),
    propagate($connection),
    callOnFault([addErrCode(ec.FARANGO_CANT_USE_SPECIFIED_DB), addNote({ msg: `Unable to use database '${extract($dbName)}'`, here: h() })]),
  )($connection),
)

// TODO: not tested at all
// Given a conneciton, for the DB being used, return colleciton by name
//   opts {
//     graceful: bool // if collection does not exist return Nothing() instead of a Fault
//   }
// '$collectionName` -> {$connection} -> J(collection) | N | F
export const getCollection = curry(async ($collectionName, $opts, $connection) => {
  const collection = Nothing()
  const errInfo = { code: ec.FARANGO_CANT_GET_COLLECTION, op: 'Getting collection', msg: `collection does not exist: '${fStr($collectionName)}'` };
  return pipeAsyncFm(
    mapMethod('collection', [$collectionName]),
    capture(collection),
    mapMethod('exists', []),
    caseOf([
      [isTrue, () => collection],
      [isFalse, () => _isGraceful($opts) ? Nothing() : Fault({ ...errInfo, here: h() })],
      [isFault, addNote({ ...errInfo, here: h() })],
      [orElse, () => Fault({ ...errInfo, here: h() })]
    ]),
  )($connection)
})

// if collectionExists return colleciton, otherwise return false
export const collectionExists = curry(($collectionName, $connection) =>
  pipeAsyncFm(
    getCollection($collectionName, { graceful }),
    caseOf([
      [isJust, reflect],
      [isNothing, () => Just(false)],
      [orElse, reflect]
    ]),
  )
)

// createCollection [async, reflective]
//   Given a connection, create a collection within the database currently being used
//   opts {
//     graceful: bool // if collection already exists, do not report error
//     use: 'dbName'  // if supplied, will switch active DB in the collection to dbName // NYI
//   }
//   '$collectionName' -> {$connection} -> J({collection}) | F
export const createCollection = curry(async ($collectionName, $opts, $connection) => {
  return pipeAsyncFm(
    // collectionExists($collectionName, $connection),
    // returnIf( [isTrue, _isGraceful($opts)])
    // returnIf(fProp('graceful', $opts) && await collectionExists($collectionName, $connection)), // TODO: can I make return if smart about promises??,a and also about hard condition vs pred?
    // logWithMsg('after returnIf'),
    // addNoteIf(isNothing, { op: 'Getting doc by id/key', msg: `no document found for id/key '${extract($idOrKey)}'`, here: h() }),
    // getCollection($collectionName, {}),
    log,
    mapMethod('collection', extract($collectionName)),
    callAsyncMethod('create', []),
    callOnFault([
      addErrCode(ec.FARANGO_CANT_CREATE_COLLECTION),
      addNote({ msg: `Unable to create collection ${extract($collectionName)}`, here: h() }),
    ]),
  )($connection)
})

// note this can change with versions of arango
const _clName = $collection => chain(prop('name'), $collection)


// TODO: accomidate {$collection} or '$collection' where the second is a name
// insertDoc [async]
//   given a colleciton, insert a doc.  Returns all info about inserted doc, including _key, _id, and _ver
//   opts {
//     use: 'dbName'  // if supplied, will switch active DB in the collection to dbName // NYI
//   }
//  {doc} -> {$collection} -> J(doc-with-key-id-and-ver-added) | F
export const insertDoc = curry(async ($doc, $collection) =>
  pipeAsyncFm(
    mapMethod('save', $doc),
    map(mergeLeft(extract($doc))),
    callOnFault([
      addErrCode(ec.FARANGO_CANT_INSERT_DOC),
      addNote({ msg: `Unable to insert doc into collection '${_clName($collection)}': ${fStr($doc)}`, here: h() }),
    ]),
  )($collection),
)

// getDocByIdOrKey [asycn]
//   get doc by id or key for given collection.  If the doc does not exist, returns Nothing()
//   opts {
//     graceful: bool // if graceful, will return Nothing if doc not found, otherwise, returns Fault
//     use: 'dbName'  // if supplied, will switch active DB in the collection to dbName // NYI
//   }
//   if graceful is true, will return Nothing if doc not found, otherwise, returns Fault
//   '$idOrKey' -> $collection -> J({doc}) | N | F
export const getDocByIdOrKey = curry(async ($idOrKey, $opts, $collection) =>
  pipeAsyncFm(
    mapMethod('document', [$idOrKey, _isGraceful($opts)]),
    addNoteIf(isNothing, { op: 'Getting doc by id/key', msg: `no document found for id/key '${extract($idOrKey)}'`, here: h() }),
    callOnFault([
      addErrCode(ec.FARANGO_CANT_GET_DOC_BY_ID),
      addNote({ msg: `Unable to query doc from collection '${_clName($collection)}' with id:key of '${extract($idOrKey)}'`, here: h() }),
    ]),
  )($collection),
)

// aqlQuery [asycn]
//   given a $connection and an aql query, execute the query
//   $query -> $connnection -> J(query-results)
//   opts {
//     use: 'dbName'  // if supplied, will switch active DB in the collection to dbName // NYI
//   }
export const aqlQuery = curry(async ($query, $connection) => {
  return pipeAsyncFm(
    mapMethod('query', $query),
    mapMethod('all', []),
    callOnFault([addErrCode(ec.FARANGO_AQL_QUERY_FAILED), addNote({ msg: `aql query failed: '${fStr($query)}'`, here: h() })]),
  )($connection)
})

// dropDatabase  [asycn, reflective]
//   '$name' => {$connection} -> {$connection} | F
export const dropDatabase = curry(async ($name, $connection) =>
  pipeAsyncFm(
    useDatabase('_system'),
    mapMethod('dropDatabase', extract($name)),
    propagate($connection),
    callOnFault([addErrCode(ec.FARANGO_CANT_DROP_DB), addNote({ msg: `Unable to drop database named '${extract($name)}'`, here: h() })]),
  )($connection),
)

// // export const aqlQuery2 = curry(async (query, $db) => {
// //   console.log('~~> aqlQuery2()');
// //   return pipeAsyncFm(
// //     log,
// //     mapMethod('query', query),
// //     log,
// //     mapMethod('all', []),
// //     log,
// //     // logFm,
// //     // addNoteIfFault(`Unable to execute aql query: '${query}'`, here()),
// //   )($db)

// // })

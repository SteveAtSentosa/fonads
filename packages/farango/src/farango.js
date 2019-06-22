import { curry, mergeLeft } from 'ramda'
import { Database, aql } from 'arangojs'
import { isNonJustFm } from '@fonads/core'
import { addNote, addTaggedNote, passthroughIf, addErrCode, callOnFault } from '@fonads/core'
import { mapMethod, callMethod, callMethodIf, mapAsyncMethod, map, propagate, extract, feq, fstr } from '@fonads/core'
import { pipeAsyncFm, instantiateClass, here } from '@fonads/core'
import { log, logRaw, logMsg, logWithMsg } from '@fonads/core'
import { ec } from './error'


const defaultServerUrl = 'http://127.0.0.1:8529'

// openConnection (NJR)
//   open a connection to arango server
//   To connect to lcoal server, pass url as 'local'
//   '$url' -> '$un' -> '$pw' -> J({connection}) | F
export const openConnection = curry(async ($url, $un, $pw) => {
  if (isNonJustFm($pw)) return $pw
  const connectionOpts = _makeConnectionOptions($url)
  return pipeAsyncFm(
    instantiateClass('arrango Database', Database),
    _applyCredsToConnection($un, $pw),
    _validateConnection,
    callOnFault([
      addErrCode(ec.ARANGO_CANT_OPEN_CONNECTION),
      addTaggedNote(`Unable to connect to arango server w these options: ${fstr(connectionOpts)}`, here()),
      addNote('Server may not be running, URL may be incorrect, or un/pw may be incorrect'),
    ]),
  )(connectionOpts)
})

// generates arrango server connections options object
const _makeConnectionOptions = $url => ({
  url: feq($url, 'local') ? defaultServerUrl : extract($url),
})

// apply un/pw to db server connection (FOP, NJR)
const _applyCredsToConnection = curry(($un, $pw, $connection) =>
  pipeAsyncFm(
    passthroughIf(isNonJustFm),
    callMethodIf($un && $pw, 'useBasicAuth', [$un, $pw]),
  )($connection),
)

// Check an arango server connection (FOP, NJR)
// $connection -> P($connection | F )
const _validateConnection = async $connection =>
  pipeAsyncFm(
    passthroughIf(isNonJustFm),
    mapAsyncMethod('query', aql`RETURN ${Date.now()}`),
    mapAsyncMethod('next', null),
    propagate($connection),
  )($connection)

// createDatabase (FOP, NJR)
// '$dbName' $connection -> P($connection | F )
export const createDatabase = curry(async ($dbName, $connection) =>
  pipeAsyncFm(
    passthroughIf(isNonJustFm),
    mapAsyncMethod('createDatabase', extract($dbName)),
    propagate($connection),
    callOnFault([
      addErrCode(ec.ARANGO_CANT_CREATE_DB),
      addTaggedNote(`Unable to create database '${extract($dbName)}'`, here()),
    ]),
  )($connection),
)

// Use a database (FOP, NJR)
// 'dbName' -> $connection -> $connection | F
export const useDatabase = curry(async ($dbName, $connection) =>
  pipeAsyncFm(
    passthroughIf(isNonJustFm),
    mapMethod('useDatabase', extract($dbName)),
    propagate($connection),
    callOnFault([
      addErrCode(ec.ARANGO_CANT_USE_SPECIFIED_DB),
      addTaggedNote(`Unable to use database ${extract($dbName)}`, here()),
    ]),
  )($connection)
)

// createCollection (NJR)
// '$collectionName' -> {$connection} -> J({collection}) | F
export const createCollection = curry(async ($collectionName, $connection) =>
  pipeAsyncFm(
    passthroughIf(isNonJustFm),
    mapMethod('collection', extract($collectionName)),
    callMethod('create', []),
    callOnFault([
      addErrCode(ec.ARANGO_CANT_CREATE_COLLECTION),
      addTaggedNote(`Unable to create collection ${extract($collectionName)}`, here()),
    ]),
  )($connection)
)

// insertDoc (NJR)
// {doc} -> {$collection} -> J(doc-with-key-and-id-added)
export const insertDoc = curry(async (doc, $collection) =>
  pipeAsyncFm(
    passthroughIf(isNonJustFm),
    mapAsyncMethod('save', doc),
    map(mergeLeft(doc)),
    callOnFault([
      addErrCode(ec.ARANGO_CANT_INSERT_DOC),
      addTaggedNote(`Unable to insert doc: ${fstr}`, here()),
    ]),
  )($collection)
)

// getDocByIdOrKey
export const getDocByIdOrKey = curry(async ($idOrKey, $collection) =>
  pipeAsyncFm(
    passthroughIf(isNonJustFm),
    mapAsyncMethod('document', extract($idOrKey)),
    callOnFault([
      addErrCode(ec.ARANGO_CANT_GET_DOC_BY_ID),
      addTaggedNote(`Unable to query doc with id or key of '${extract($idOrKey)}'`, here()),
    ]),
  )($collection)
)

// dropDatabase
//   '$name' => {$connection} -> {$connection} | F
export const dropDatabase = curry(async ($name, $connection) =>
  pipeAsyncFm(
    passthroughIf(isNonJustFm),
    useDatabase('_system'),
    mapAsyncMethod('dropDatabase', extract($name)),
    propagate($connection),
    callOnFault([
      addErrCode(ec.ARANGO_CANT_DROP_DB),
      addTaggedNote(`Unable to drop database named '${extract($name)}'`, here()),
    ]),
  )($connection)
)

// // export const aqlQuery2 = curry(async (query, $db) => {
// //   console.log('~~> aqlQuery2()');
// //   return pipeAsyncFm(
// //     log,
// //     mapAsyncMethod('query', query),
// //     log,
// //     mapAsyncMethod('all', []),
// //     log,
// //     // logFm,
// //     // addNoteIfFault(`Unable to execute aql query: '${query}'`, here()),
// //   )($db)

// // })


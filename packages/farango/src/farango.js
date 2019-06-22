import { curry, mergeLeft } from 'ramda'
import { Database, aql } from 'arangojs'
import { isFault, isNonJustFm } from '@fonads/core'
import { addNoteIf, addTaggedNoteIf, passthroughIf, done } from '@fonads/core'
import { mapMethod, callMethod, callMethodIf, mapAsyncMethod, map, propagate, extract, feq, fstr } from '@fonads/core'
import { pipeAsync, instantiateClass, here } from '@fonads/core'
// import { log, logRaw, logMsg, logWithMsg } from '@fonads/core'

const defaultServerUrl = 'http://127.0.0.1:8529'

// openConnection (NJR)
//   open a connection to arango server
//   To connect to lcoal server, pass url as 'local'
//   '$url' -> '$un' -> '$pw' -> J({connection}) | F
export const openConnection = curry(async ($url, $un, $pw) => {
  if (isNonJustFm($pw)) return $pw
  const connectionOpts = _makeConnectionOptions($url)
  return pipeAsync(
    instantiateClass('arrango Database', Database),
    _applyCredsToConnection($un, $pw),
    _validateConnection,
    addTaggedNoteIf(isFault, `Unable to connect to arango server w these options: ${fstr(connectionOpts)}`, here()),
    addNoteIf(isFault, 'Server may not be running, URL may be incorrect, or un/pw may be incorrect'),
  )(connectionOpts)
})

// generates arrango server connections options object
const _makeConnectionOptions = $url => ({
  url: feq($url, 'local') ? defaultServerUrl : extract($url),
})

// apply un/pw to db server connection (FOP, NJR)
const _applyCredsToConnection = curry(($un, $pw, $connection) =>
  pipeAsync(
    passthroughIf(isNonJustFm),
    callMethodIf($un && $pw, 'useBasicAuth', [$un, $pw]),
    done
  )($connection),
)

// Check an arango server connection (FOP, NJR)
// $connection -> P($connection | F )
const _validateConnection = async $connection =>
  pipeAsync(
    passthroughIf(isNonJustFm),
    mapAsyncMethod('query', aql`RETURN ${Date.now()}`),
    mapAsyncMethod('next', null),
    propagate($connection),
    done,
  )($connection)

// createDatabase (FOP, NJR)
// '$dbName' $connection -> P($connection | F )
export const createDatabase = curry(async ($dbName, $connection) =>
  pipeAsync(
    passthroughIf(isNonJustFm),
    mapAsyncMethod('createDatabase', extract($dbName)),
    addTaggedNoteIf(isFault, `Unable to create database ${extract($dbName)}`, here()),
    propagate($connection),
    done,
  )($connection),
)

// Use a database (FOP, NJR)
// 'dbName' -> $connection -> $connection | F
export const useDatabase = curry(async ($dbName, $connection) =>
  pipeAsync(
    passthroughIf(isNonJustFm),
    mapMethod('useDatabase', extract($dbName)),
    addTaggedNoteIf(isFault, `Unable to use database ${extract($dbName)}`, here()),
    propagate($connection),
    done
  )($connection)
)

// createCollection (NJR)
// '$collectionName' -> {$connection} -> J({collection}) | F
export const createCollection = curry(async ($collectionName, $connection) =>
  pipeAsync(
    passthroughIf(isNonJustFm),
    mapMethod('collection', extract($collectionName)),
    callMethod('create', []),
    addTaggedNoteIf(isFault, `Unable to create collection ${extract($collectionName)}`, here()),
    done
  )($connection)
)

// insertDoc (NJR)
// {doc} -> {$collection} -> J(doc-with-key-and-id-added)
export const insertDoc = curry(async (doc, $collection) =>
  pipeAsync(
    passthroughIf(isNonJustFm),
    mapAsyncMethod('save', doc),
    map(mergeLeft(doc)),
    addTaggedNoteIf(isFault, `Unable to insert doc`, here()),
    done
  )($collection)
)

// getDocByIdOrKey
export const getDocByIdOrKey = curry(async ($idOrKey, $collection) =>
  pipeAsync(
    passthroughIf(isNonJustFm),
    mapAsyncMethod('document', extract($idOrKey)),
    addTaggedNoteIf(isFault, `Unable to query doc with id or key of '${extract($idOrKey)}'`, here()),
    done
  )($collection)
)

// dropDatabase
//   '$name' => {$connection} -> {$connection} | F
export const dropDatabase = curry(async ($name, $connection) =>
  // if (isNonJustFm($connection)) return $connection
  // const name = extract($name)
  pipeAsync(
    passthroughIf(isNonJustFm),
    useDatabase('_system'),
    mapAsyncMethod('dropDatabase', extract($name)),
    addTaggedNoteIf(isFault, `Unable to drop database named '${extract($name)}'`, here()),
    propagate($connection),
    done
  )($connection)
)

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


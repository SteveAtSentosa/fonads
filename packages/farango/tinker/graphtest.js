import { prop, curry, any, find } from 'ramda'
import { Nothing } from '@fonads/core'
import {
  Just, pipeAsync, isNotFault, capture, switchTo, logStatus, logMsg, logMsgIf, isFault,
  logWithMsg
} from '@fonads/core'
import {
  openConnection, dropDatabase, createDatabase, createCollection, insertDoc, createGraph
} from '../src/farango'
import { aql } from 'arangojs';
import { log } from '@fonads/core'


// TODO:
// * look into collection import (see 20-graph-edge-collections.ts in arango tests)
// * look into operating on db.collection(collectionName) / db.graph(graphName)
// * look through arango tests to get better feel for use of javascript interface


const docEntry = (name, data) => ({ ...data, _key: name, name })

const usersData = [
  // docEntry('admin'),
  docEntry('jim'),
  docEntry('jill'),
  docEntry('bill'),
  docEntry('joe'),
  docEntry('trainer'),
  docEntry('trustedTrainer'),
]

const grantsData = [
  // docEntry('jimsGrantsToJim'),
  // docEntry('jimsGrantsToAdmin'),
  docEntry('jimsGrantsToBill', { granter: 'users/jim', grantee: 'users/bill' }),
  docEntry('jimsGrantsToJoe', { granter: 'users/jim', grantee: 'users/joe' }),
  docEntry('jillsGrantsToJoe', { granter: 'users/jill', grantee: 'users/joe' }),
  docEntry('jillsGrantsToJim', { granter: 'users/jill', grantee: 'users/jim' }),
  docEntry('jillsGrantsToTrainer', { granter: 'users/jill', grantee: 'users/trainer' }),
  docEntry('jillsGrantsToTrustedTrainer', { granter: 'users/jill', grantee: 'users/trustedTrainer' }),
]

const rolesData = [
  // docEntry('Admin'),
  docEntry('Follower'),
  docEntry('Confidant'),
  docEntry('Self'),
  docEntry('Trainer'),
]

const rwud = priv => ([
  docEntry(`${priv}Read`),
  docEntry(`${priv}Write`),
  docEntry(`${priv}Update`),
  docEntry(`${priv}Delete`),
])

const privilegesData = [
  ...rwud('Plan'),
  ...rwud('Weight'),
  ...rwud('Journal'),
  ...rwud('Comments'),
  docEntry('All')
]

const rolePrivilegeEdges = [
  // { _from: 'roles/Admin', _to: 'privileges/All' },
  // { _from: 'roles/Self', _to: 'privileges/All' },
  { _from: 'roles/Follower', _to: 'privileges/PlanRead' },
  { _from: 'roles/Confidant', _to: 'privileges/PlanRead' },
  { _from: 'roles/Confidant', _to: 'privileges/WeightRead' },
  { _from: 'roles/Confidant', _to: 'privileges/JournalRead' },
  { _from: 'roles/Confidant', _to: 'privileges/CommentsRead' },
  { _from: 'roles/Confidant', _to: 'privileges/CommentsWrite' },
  { _from: 'roles/Trainer', _to: 'privileges/PlanRead' },
  { _from: 'roles/Trainer', _to: 'privileges/PlanWrite' },
  { _from: 'roles/Trainer', _to: 'privileges/PlanUpdate' },
  { _from: 'roles/Trainer', _to: 'privileges/PlanDelete' },
  { _from: 'roles/Trainer', _to: 'privileges/CommentsRead' },
  { _from: 'roles/Trainer', _to: 'privileges/CommentsWrite' },
  { _from: 'roles/Trainer', _to: 'privileges/WeightRead' },
]

const grantRoleEdges = [
  // { _from: 'grants/jimsGrantsToJim', _to: 'roles/Self' },
  // { _from: 'grants/jimsGrantsToAdmin', _to: 'roles/Admin' },
  { _from: 'grants/jimsGrantsToBill', _to: 'roles/Follower' },
  { _from: 'grants/jimsGrantsToJoe', _to: 'roles/Confidant' },
  { _from: 'grants/jillsGrantsToJoe', _to: 'roles/Follower' },
  { _from: 'grants/jillsGrantsToJim', _to: 'roles/Confidant' },
  { _from: 'grants/jillsGrantsToTrainer', _to: 'roles/Trainer' },
  { _from: 'grants/jillsGrantsToTrustedTrainer', _to: 'roles/Trainer' },

]

const grantPrivilegeEdges = [
  { _from: 'grants/jillsGrantsToTrustedTrainer', _to: 'privileges/JournalRead' },
]

const userGrantEdges = [
  { _from: 'users/jim', _to: 'grants/jimsGrantsToBill', type: 'fromMe' },
  { _from: 'users/bill', _to: 'grants/jimsGrantsToBill', type: 'toMe' },
  { _from: 'users/jim', _to: 'grants/jimsGrantsToJoe', type: 'fromMe' },
  { _from: 'users/joe', _to: 'grants/jimsGrantsToJoe', type: 'toMe' },
  { _from: 'users/jill', _to: 'grants/jillsGrantsToJoe', type: 'fromMe' },
  { _from: 'users/joe', _to: 'grants/jillsGrantsToJoe', type: 'toMe' },
  { _from: 'users/jill', _to: 'grants/jillsGrantsToJim', type: 'fromMe' },
  { _from: 'users/jim', _to: 'grants/jillsGrantsToJim', type: 'toMe' },
  { _from: 'users/jill', _to: 'grants/jillsGrantsToTrainer', type: 'fromMe' },
  { _from: 'users/trainer', _to: 'grants/jillsGrantsToTrainer', type: 'toMe' },
  { _from: 'users/jill', _to: 'grants/jillsGrantsToTrustedTrainer', type: 'fromMe' },
  { _from: 'users/trustedTrainer', _to: 'grants/jillsGrantsToTrustedTrainer', type: 'toMe' },
]

const createVerticies = curry(async (dataList, collection) => {
  if (isFault(collection)) return collection
  const insertedDocs = await Promise.all(dataList.map(data => insertDoc(data, collection)))
  const fault = find(isFault, insertedDocs)
  return fault || Just(insertedDocs)
})

const createUsers = createVerticies(usersData)
const createGrants = createVerticies(grantsData)
const createRoles = createVerticies(rolesData)
const createPrivileges = createVerticies(privilegesData)

const createEdges = curry(async (edgeList, collection) => {
  if (isFault(collection)) return collection
  const insertedEdges = await Promise.all(edgeList.map(edge => insertDoc(edge, collection)))
  const fault = find(isFault, insertedEdges)
  return fault || Just(insertedEdges)
})

const createRolePrivilegeEdges = createEdges(rolePrivilegeEdges)
const createGrantRoleEdges = createEdges(grantRoleEdges)
const createUserGrantEdges = createEdges(userGrantEdges)
const createGrantPrivilegeEdges = createEdges(grantPrivilegeEdges)

const edgeDefintions = [
  { collection: 'RolePrivilege',  from: ['roles'],  to: ['privileges'] },
  { collection: 'GrantRole',  from: ['grants'],  to: ['roles'] },
  { collection: 'GrantPrivilege',  from: ['grants'],  to: ['privileges'] },
  { collection: 'UserGrant',  from: ['users'],  to: ['grants'] }
]

const connection = Nothing()
const use = true
const graceful = true
const edge = true

const userCollection = Nothing()
const grantsCollection = Nothing()
const rolesCollection = Nothing()
const privilegesCollection = Nothing()
const rolePrivilegeEdgeCollection = Nothing()
const grantRoleEdgeCollection = Nothing()
const grantPrivilegeEdgeCollection = Nothing()
const userGrantEdgeCollection = Nothing()

const users = Nothing()
const grants = Nothing()
const roles = Nothing()
const privilges = Nothing()


const go = () =>
  pipeAsync(
    logMsg('\n... opening server connection'),
    openConnection('root', 'pw'),
    capture(connection),

    logMsgIf(isNotFault, '\n... deleting database if it exists'),
    dropDatabase('gtest', { graceful }),

    logMsgIf(isNotFault, '\n... creating database'),
    createDatabase('gtest', { use, graceful }),

    logMsgIf(isNotFault, '\n... creating vertex collections'),
    switchTo(connection), createCollection('users', { graceful }), capture(userCollection),
    switchTo(connection), createCollection('grants', { graceful }), capture(grantsCollection),
    switchTo(connection), createCollection('roles', { graceful }), capture(rolesCollection),
    switchTo(connection), createCollection('privileges', { graceful }), capture(privilegesCollection),

    logMsgIf(isNotFault, '\n... creating edge collections'),
    switchTo(connection), createCollection('RolePrivilege', { graceful, edge }), capture(rolePrivilegeEdgeCollection),
    switchTo(connection), createCollection('GrantRole', { graceful, edge }), capture(grantRoleEdgeCollection),
    switchTo(connection), createCollection('GrantPrivilege', { graceful, edge }), capture(grantPrivilegeEdgeCollection),
    switchTo(connection), createCollection('UserGrant', { graceful, edge }), capture(userGrantEdgeCollection),

    logMsgIf(isNotFault, '\n... creating users'),
    switchTo(userCollection), createUsers, capture(users),

    logMsgIf(isNotFault, '\n... creating grants'),
    switchTo(grantsCollection), createGrants, capture(grants),

    logMsgIf(isNotFault, '\n... creating roles'),
    switchTo(rolesCollection), createRoles, capture(roles),

    logMsgIf(isNotFault, '\n... creating privileges'),
    switchTo(privilegesCollection), createPrivileges, capture(privilges),

    logMsgIf(isNotFault, '\n... creating RolePrivilege edges'),
    switchTo(rolePrivilegeEdgeCollection), createRolePrivilegeEdges,

    logMsgIf(isNotFault, '\n... creating GrantRole edges'),
    switchTo(grantRoleEdgeCollection), createGrantRoleEdges,

    logMsgIf(isNotFault, '\n... creating GrantPrivilege edges'),
    switchTo(grantPrivilegeEdgeCollection), createGrantPrivilegeEdges,

    logMsgIf(isNotFault, '\n... creating UserGrant edges'),
    switchTo(userGrantEdgeCollection), createUserGrantEdges,

    logMsgIf(isNotFault, '\n... creating graph'),
    switchTo(connection),
    createGraph('userGraph', edgeDefintions),

    logMsg('\nDONE'),
    logStatus,
  )('local')

const doit = async () => {
  await go()
}

doit()




// export const insertDoc = curry(async ($doc, $collection) =>

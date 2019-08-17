import { prop, curry, any, find, __ } from 'ramda'
import { aql } from 'arangojs';

import {
  Just, Nothing, pipeAsync, capture, switchTo,
  isNotFault, isFault, isNothing, isNonJustFm, extract,
  log, logStatus, logMsg, logMsgIf, logWithMsg,
  fReturnTrue, fReturnFalse, orElse, fPropEq, caseOf
}
from '@fonads/core'

import {
  openConnection, dropDatabase, createDatabase, createCollection,
  createGraph, insertDoc, aqlQuery, aqlQueryOne
}
from '../src/farango'


// TODO:
// * look into collection import (see 20-graph-edge-collections.ts in arango tests)
// * look into operating on db.collection(collectionName) / db.graph(graphName)
// * look through arango tests to get better feel for use of javascript interface


const docEntry = (name, data = {}) => ({ ...data, _key: name, name })

const usersData = [
  // docEntry('admin'),
  docEntry('jim', { type: 'User' }),
  docEntry('jill', { type: 'User' }),
  docEntry('bill', { type: 'User' }),
  docEntry('joe', { type: 'User' }),
  docEntry('trainer', { type: 'User' }),
  docEntry('trustedTrainer', { type: 'User' }),
]

const grantsData = [
  // docEntry('jimsGrantsToJim'),
  // docEntry('jimsGrantsToAdmin'),
  docEntry('jimsGrantsToBill', { type: 'Grant' }),
  docEntry('jimsGrantsToJoe', { type: 'Grant' }),
  docEntry('jillsGrantsToJoe', { type: 'Grant' }),
  docEntry('jillsGrantsToJim', { type: 'Grant' }),
  docEntry('jillsGrantsToTrainer', { type: 'Grant' }),
  docEntry('jillsGrantsToTrustedTrainer', { type: 'Grant' }),
]

const rolesData = [
  // docEntry('Admin'),
  // docEntry('Self'),
  docEntry('Follower', { type: 'Role' }),
  docEntry('Confidant', { type: 'Role' }),
  docEntry('Trainer', { type: 'Role' }),
]

const rwud = priv => ([
  docEntry(`${priv}Read`, { type: 'Privilege' }),
  docEntry(`${priv}Write`, { type: 'Privilege' }),
  docEntry(`${priv}Update`, { type: 'Privilege' }),
  docEntry(`${priv}Delete`, { type: 'Privilege' }),
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
  { _from: 'roles/Follower', _to: 'privileges/PlanRead', edgeType: 'RolePrivilege' },
  { _from: 'roles/Confidant', _to: 'privileges/PlanRead', edgeType: 'RolePrivilege' },
  { _from: 'roles/Confidant', _to: 'privileges/WeightRead', edgeType: 'RolePrivilege' },
  { _from: 'roles/Confidant', _to: 'privileges/JournalRead', edgeType: 'RolePrivilege' },
  { _from: 'roles/Confidant', _to: 'privileges/CommentsRead', edgeType: 'RolePrivilege' },
  { _from: 'roles/Confidant', _to: 'privileges/CommentsWrite', edgeType: 'RolePrivilege' },
  { _from: 'roles/Trainer', _to: 'privileges/PlanRead', edgeType: 'RolePrivilege' },
  { _from: 'roles/Trainer', _to: 'privileges/PlanWrite', edgeType: 'RolePrivilege' },
  { _from: 'roles/Trainer', _to: 'privileges/PlanUpdate', edgeType: 'RolePrivilege' },
  { _from: 'roles/Trainer', _to: 'privileges/PlanDelete', edgeType: 'RolePrivilege' },
  { _from: 'roles/Trainer', _to: 'privileges/CommentsRead', edgeType: 'RolePrivilege' },
  { _from: 'roles/Trainer', _to: 'privileges/CommentsWrite', edgeType: 'RolePrivilege' },
  { _from: 'roles/Trainer', _to: 'privileges/WeightRead', edgeType: 'RolePrivilege' },
]

const grantRoleEdges = [
  // { _from: 'grants/jimsGrantsToJim', _to: 'roles/Self' },
  // { _from: 'grants/jimsGrantsToAdmin', _to: 'roles/Admin' },
  { _from: 'grants/jimsGrantsToBill', _to: 'roles/Follower', edgeType: 'GrantRole' },
  { _from: 'grants/jimsGrantsToJoe', _to: 'roles/Confidant', edgeType: 'GrantRole' },
  { _from: 'grants/jillsGrantsToJoe', _to: 'roles/Follower', edgeType: 'GrantRole' },
  { _from: 'grants/jillsGrantsToJim', _to: 'roles/Confidant', edgeType: 'GrantRole' },
  { _from: 'grants/jillsGrantsToTrainer', _to: 'roles/Trainer', edgeType: 'GrantRole' },
  { _from: 'grants/jillsGrantsToTrustedTrainer', _to: 'roles/Trainer', edgeType: 'GrantRole' },

]

const grantPrivilegeEdges = [
  { _from: 'grants/jillsGrantsToTrustedTrainer', _to: 'privileges/JournalRead', edgeType: 'GrantPrivilege' },
]

const granterGrantEdges = [
  { _from: 'users/jim', _to: 'grants/jimsGrantsToBill', edgeType: 'GranterGrant' },
  { _from: 'users/jim', _to: 'grants/jimsGrantsToJoe', edgeType: 'GranterGrant' },
  { _from: 'users/jill', _to: 'grants/jillsGrantsToJoe', edgeType: 'GranterGrant' },
  { _from: 'users/jill', _to: 'grants/jillsGrantsToJim', edgeType: 'GranterGrant' },
  { _from: 'users/jill', _to: 'grants/jillsGrantsToTrainer', edgeType: 'GranterGrant' },
  { _from: 'users/jill', _to: 'grants/jillsGrantsToTrustedTrainer', edgeType: 'GranterGrant' },
]

const grantGranteeEdges = [
  { _from: 'grants/jimsGrantsToBill', _to: 'users/bill', edgeType: 'GrantGrantee' },
  { _from: 'grants/jimsGrantsToJoe', _to: 'users/joe', edgeType: 'GrantGrantee' },
  { _from: 'grants/jillsGrantsToJoe', _to: 'users/joe', edgeType: 'GrantGrantee' },
  { _from: 'grants/jillsGrantsToJim', _to: 'users/jim', edgeType: 'GrantGrantee' },
  { _from: 'grants/jillsGrantsToTrainer', _to: 'users/trainer', edgeType: 'GrantGrantee' },
  { _from: 'grants/jillsGrantsToTrustedTrainer', _to: 'users/trustedTrainer', edgeType: 'GrantGrantee' },
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
const createGranterGrantEdges = createEdges(granterGrantEdges)
const createGrantGranteeEdges = createEdges(grantGranteeEdges)
const createGrantPrivilegeEdges = createEdges(grantPrivilegeEdges)

const edgeDefintions = [
  { collection: 'RolePrivilege',  from: ['roles'],  to: ['privileges'] },
  { collection: 'GrantRole',  from: ['grants'],  to: ['roles'] },
  { collection: 'GrantPrivilege',  from: ['grants'],  to: ['privileges'] },
  { collection: 'GranterGrant',  from: ['users'],  to: ['grants'] },
  { collection: 'GrantGrantee',  from: ['grants'],  to: ['users'] }
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
const granterGrantEdgeCollection = Nothing()
const grantGranteeEdgeCollection = Nothing()

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
    switchTo(connection), createCollection('GranterGrant', { graceful, edge }), capture(granterGrantEdgeCollection),
    switchTo(connection), createCollection('GrantGrantee', { graceful, edge }), capture(grantGranteeEdgeCollection),

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

    logMsgIf(isNotFault, '\n... creating GranterGrant edges'),
    switchTo(granterGrantEdgeCollection), createGranterGrantEdges,

    logMsgIf(isNotFault, '\n... creating GrantGrantee edges'),
    switchTo(grantGranteeEdgeCollection), createGrantGranteeEdges,

    logMsgIf(isNotFault, '\n... creating graph'),
    switchTo(connection),
    createGraph('userGraph', edgeDefintions),


    logMsgIf(isNotFault, '\n... checking privilege grants'),

    switchTo(connection),  checkPriv('jill', 'jim', 'JournalRead'),
    logWithMsg('\njill -> jim -> JournalRead'),

    switchTo(connection),  checkPriv('jill', 'joe', 'JournalRead'),
    logWithMsg('\njill -> joe -> JournalRead'),

    switchTo(connection),  checkPriv('jill', 'joe', 'PlanRead'),
    logWithMsg('\njill -> joe -> PlanRead'),

    switchTo(connection),  checkPriv('jill', 'joe', 'PlanWrite'),
    logWithMsg('\njill -> joe -> PlanWrite'),

    switchTo(connection),  checkPriv('jill', 'trainer', 'PlanWrite'),
    logWithMsg('\njill -> trainer -> PlanWrite'),

    switchTo(connection),  checkPriv('jill', 'trainer', 'JournalRead'),
    logWithMsg('\njill -> trainer -> JournalRead'),

    switchTo(connection),  checkPriv('jill', 'trustedTrainer', 'JournalRead'),
    logWithMsg('\njill -> trustedTrainer -> JournalRead'),

    logMsg('\nDONE'),
    logStatus,
  )('local')


//*****************************************************************************


const checkPriv = curry(async ($fromUser, $toUser, $privilege, $connection) =>
  pipeAsync(
    getGrantNode($fromUser, $toUser),
    getGrantPriv(__, $privilege, $connection),
    caseOf([
      [ isNothing, fReturnFalse ],
      [ [ fPropEq('type', 'Privilege'), fPropEq('name', $privilege) ],
        fReturnTrue ], // TODO: if nothing is passed into fPropEq, returns true ... need to figure that one out
      [ orElse, fReturnFalse ]
    ]),
  )(connection)
)

const getGrantPriv = curry(async ($grantNode, $privilege, $connection) => {
  return aqlQueryOne(`
    for v in 1..5
    outbound '${extract($grantNode)}'
    RolePrivilege, GrantRole, GrantPrivilege
    filter v.type == 'Privilege' and v._id == 'privileges/${extract($privilege)}'
    limit 1
    return v`, $connection)
})

const getGrantNode = curry(($fromUser, $toUser, connection) =>
  aqlQueryOne(`
    FOR v, e, p IN 1..2
    OUTBOUND 'users/${extract($fromUser)}'
    GranterGrant, GrantGrantee
    FILTER e.edgeType == 'GrantGrantee'
      AND v.type == 'User'
      AND v._id == 'users/${extract($toUser)}'
    LIMIT 1
    RETURN p.vertices[1]._id`, connection),
)


const doit = async () => {
  await go()
}

doit()
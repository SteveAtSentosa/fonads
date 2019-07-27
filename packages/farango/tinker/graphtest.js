import { prop, curry } from 'ramda'
import { Nothing } from '@fonads/core'
import {
  pipeAsync, isNotFault, capture, switchTo, logStatus, logMsg, logIf, logMsgIf, logWithMsg,
  faultIf, mapTo, isNothing, h, call
} from '@fonads/core'
import {
  openConnection, dropDatabase, createDatabase, useDatabase, createCollection, getDocByIdOrKey, insertDoc, aqlQuery
} from '../src/farango'
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

const userCollection = Nothing()
const grantsCollection = Nothing()
const rolesCollection = Nothing()
const privilegesCollection = Nothing()

const users = [
  { firstName: 'steve' },
  { firstName: 'jane' },
  { firstName: 'jim' },
  { firstName: 'joe' },
  { firstName: 'admin' },
  { firstName: 'billFollower' },
  { firstName: 'bobFollower' },
  { firstName: 'jillConfidant' },
  { firstName: 'someTrainer' },
  { firstName: 'trustedTrainer' },
]

const grants = [
  { name: 'allGrantsToAdmin' },
  { name: 'stevesGrantsToBill' },
  { name: 'stevesGrantsToBob' },
  { name: 'janesGrantsToBob' },
  { name: 'janesGrantsToJill' },
  { name: 'jimsGrantsToJim' },
  { name: 'joesGrantsToSomeTrainer' },
  { name: 'joesGrantsToTrustedTrainer' },
]

const roles = [
  { name: 'Admin' },
  { name: 'Follower' },
  { name: 'Confidant' },
  { name: 'Self' },
  { name: 'Trainer' },
]

const rwud = priv => ([
  { name: `${priv}Read` },
  { name: `${priv}Write` },
  { name: `${priv}Update` },
  { name: `${priv}Delete` },
])

const privileges = [
  ...rwud('Plan')
]

const createVerticies = curry((dataList, collection) => {
  dataList.forEach(data => {insertDoc(data, collection)})
  return collection
})
const createUsers = createVerticies(users)
const createGrants = createVerticies(grants)
const createRoles = createVerticies(roles)
const createPrivileges = createVerticies(privileges)


const go = () =>
  pipeAsync(
    logMsg('\n... opening server connection'),
    openConnection('root', 'pw'),
    capture(connection),

    logMsgIf(isNotFault, '\n... deleting database if it exists'),
    dropDatabase('gtest', { graceful }),

    logMsgIf(isNotFault, '\n... creating database'),
    createDatabase('gtest', { use, graceful }),

    logMsgIf(isNotFault, '\n... creating collections'),

    createCollection('users', { graceful }),
    capture(userCollection),
    switchTo(connection),

    createCollection('grants', { graceful }), capture(grantsCollection), switchTo(connection),
    createCollection('roles', { graceful }), capture(rolesCollection), switchTo(connection),
    createCollection('privileges', { graceful }), capture(privilegesCollection), switchTo(connection),

    logMsgIf(isNotFault, '\n... creating users'),
    switchTo(userCollection),  createUsers,

    logMsgIf(isNotFault, '\n... creating users'),
    switchTo(userCollection), createUsers,

    logMsgIf(isNotFault, '\n... creating grants'),
    switchTo(grantsCollection), createGrants,

    logMsgIf(isNotFault, '\n... creating roles'),
    switchTo(rolesCollection), createRoles,

    logMsgIf(isNotFault, '\n... creating privileges'),
    switchTo(privilegesCollection), createPrivileges,

    logMsgIf(isNotFault, '\n... linking roles to privileges'),
    switchTo(connection),


    // const createUsers = collection => users.forEach(user => insertDoc({ user, collection }))



    // insertDoc(tinkerDoc),




    // steve, jane, jim, joe
    // admin
    // billFollower, bobFollower, jillConfidant, someTrainer, trustedTrainer
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




// export const insertDoc = curry(async ($doc, $collection) =>

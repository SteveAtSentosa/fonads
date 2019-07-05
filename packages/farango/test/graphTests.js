import  { expect } from 'chai'
import { pipeAsync, isNotFault, capture, switchTo, logStatus, logMsg, logIf, logMsgIf, faultIf, mapTo, isNothing, isJust, h, extract, Nothing } from '@fonads/core'
import { openConnection, dropDatabase, createDatabase, useDatabase, createCollection, getDocByIdOrKey, insertDoc, aqlQuery } from './src/farango'

export default function runGraphTests() {

  let connection = Nothing()

  // TODO: figure out if I can insert a mocha or jest expect in a pipeline

  describe('set up database and collection', () => {
    it('should create a connection', () => {
      connection = openConnection('root', 'pw', 'local')
      expect(isJust(connection)).to.equal(true)
    })

    // ($un, $pw, $url)


    // it('should create a database', () => {
    //   db.createDB('oioioi')
    //     .then(() => console.log('DB Created')
    //     .catch(e=> console.log('Error creawting DB: ', e))
    // })
  })
}

import { expect } from 'chai'
import { isJust, Nothing } from '@fonads/core'
import { openConnection, dropDatabase, createDatabase, useDatabase, createCollection, getDocByIdOrKey, insertDoc, aqlQuery } from '../src/farango'

export default function runGraphTests() {
  let connection = Nothing()

  // TODO: figure out if I can insert a mocha or jest expect in a pipeline

  describe('set up database and collection', () => {
    // it('should create a connection', () => {
    //   connection = openConnection('root', 'pw', 'local')
    //   expect(isJust(connection)).to.equal(true)
    // })
  })
}

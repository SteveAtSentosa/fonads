import  { expect } from 'chai'
import { openConnection } from '../src/farango'

export default function runSmokeTests() {

  let db;

  describe('arango smoke tests', () => {
    it('should create a connection', () => {
      db = openConnection('local')
    })

    // it('should create a database', () => {
    //   db.createDB('oioioi')
    //     .then(() => console.log('DB Created')
    //     .catch(e=> console.log('Error creawting DB: ', e))
    // })
  })
}

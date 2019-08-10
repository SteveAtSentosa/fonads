import { Database } from 'arangojs'

const go = async () => {
  const cnOpts = { url: 'http://127.0.0.1:8529' }
  const cn = new Database(cnOpts)
  cn.useBasicAuth('root', 'pw')

  const dbName = 'directDb'
  try {
    await cn.dropDatabase(dbName)
  } catch (e) {}

  cn.createDatabase(dbName)
  cn.useDatabase(dbName)

  const vertexCollectionNames = ['vc1', 'vc2']
  const edgeCollectionNames = ['ec1', 'ec2']

  await Promise.all([
    ...vertexCollectionNames.map(name => cn.collection(name).create()),
    ...edgeCollectionNames.map(name => cn.edgeCollection(name).create())
  ])

  const graph = cn.graph(`stevo-graph`);

  const graphLayout = {
    edgeDefinitions: edgeCollectionNames.map(name => ({
      collection: name,
      from: vertexCollectionNames,
      to: vertexCollectionNames
    }))
  }

  console.log('graphLayout', JSON.stringify(graphLayout, null, 2))

  await graph.create(graphLayout);

  const gdata = await graph.get();
  console.log('gdata', JSON.stringify(gdata, null, 2))

  cn.collection('vc1').save({ _key: 'vc1-1', name: 'vc1-1' })

  cn.collection('vc2').save({ _key: 'vc2-1', name: 'vc2-1' })
  cn.collection('vc2').save({ _key: 'vc2-2', name: 'vc2-2' })
  cn.collection('vc2').save({ _key: 'vc2-3', name: 'vc2-3' })

  cn.edgeCollection('ec1').save({ _from: "vc1/vc1-1", _to: "vc2/vc2-1" })
  cn.edgeCollection('ec1').save({ _from: "vc1/vc1-1", _to: "vc2/vc2-2" })
  cn.edgeCollection('ec1').save({ _from: "vc1/vc1-1", _to: "vc2/vc2-3" })

  cn.edgeCollection('ec1').save({ _from: "vc2/vc2-1", _to: "vc2/vc2-3" })
  cn.edgeCollection('ec1').save({ _from: "vc2/vc2-2", _to: "vc2/vc2-1" })
  cn.edgeCollection('ec1').save({ _from: "vc2/vc2-3", _to: "vc2/vc2-2" })
}

go().catch(e => console.log('ERROR: ', e.message))

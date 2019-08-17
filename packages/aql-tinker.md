

# from webinar

RETURN DOCUMENT("users/jill") ... try that out

GEO_POINT(lat, long) ... shows on map

joins are simply nested loops in aql

COLLECT - grouping

COLLECT AGGREGATE : performance enhance

SORT


# Notes


```
FOR vertex[, edge[, path]]
 IN [min[..max]]
 OUTBOUND|INBOUND|ANY startVertex <- traversal direction & start node
 edgeCollection[, more...]        <- edge collections that participate the traversal
```

FOR emits up to three variables
* vertex (object): the current vertex in a traversal
* edge (object, optional): the current edge in a traversal
* path (object, optional): representation of the current path with two members:
* vertices: an array of all vertices on this path
* edges: an array of all edges on this path

IN min..max: defines the minimal and maximal depth for the
traversal. If not specified min defaults to 1 and max defaults to min


# These work

> to get grant

for v, e, p in 1..2
  outbound 'users/jill'
  GranterGrant, GrantGrantee
  filter e.edgeType == 'GrantGrantee' and v.type == 'User' and v._id == 'users/jim'
  limit 1
  return p.vertices[1]._id

[
  "grants/jillsGrantsToJim"
]

> to check for privilege grant

for v in 1..5
  outbound 'grants/jillsGrantsToTrustedTrainer'
  RolePrivilege, GrantRole, GrantPrivilege
  filter v.type == 'Privilege' and v._id == 'privileges/JournalRead'
  limit 1
  return v._id



> All in one shot via sub query

[
  "privileges/JournalRead"
]

for vert in 1..5
  let grantsId = (
    for v, e, p in 1..2
      outbound 'users/jill'
      GranterGrant, GrantGrantee
      filter e.edgeType == 'GrantGrantee' and v.type == 'User' and v._id == 'users/jim'
      limit 1
      return p.vertices[1]._id
  )
  outbound 'grants/jillsGrantsToTrustedTrainer'
  RolePrivilege, GrantRole, GrantPrivilege
  filter vert.type == 'Privilege' and vert._id == 'privileges/JournalRead'
  limit 1
  return vert._id

> this works
```
LET qFromUser = 'users/jill'
LET qToUser = 'users/trustedTrainer'
LET qPriv = 'privileges/JournalRead'
LET grant = (
    for v, e, p in 1..2
      outbound qFromUser
      GranterGrant, GrantGrantee
      filter e.edgeType == 'GrantGrantee' and v.type == 'User' and v._id == qToUser
      limit 1
      return p.vertices[1]._id
    )
for v in 1..5
  outbound grant[0]
  RolePrivilege, GrantRole, GrantPrivilege
  filter v.type == 'Privilege' and v._id == qPriv
  limit 1
  return v._id
```

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

for grant in UserGrant
    filter grant._from == "users/trustedTrainer"
    filter grant.type == "toMe"
    return grant

for grant in grants
    filter grant.granter == 'users/jill' AND grant.grantee == 'users/joe'
    return grant

for v in 1..5
  outbound 'grants/jimsGrantsToJoe'
  RolePrivilege, GrantRole, GrantPrivilege, UserGrant
  filter v.name == 'JournalRead'
  limit 1
  return v


# Tinker

for v in 1..5 outbound
  let grant = FIRST(
    for grant in UserGrant
        filter grant._from == "users/trustedTrainer"
        filter grant.type == "toMe"
        return grant
    )
  grant
  RolePrivilege, GrantRole, GrantPrivilege, UserGrant
  filter v._key == 'PlanRead'
  return v


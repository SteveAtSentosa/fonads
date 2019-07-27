

map: isNothing, nothing => nothing
  this needs to come back as true
  fonad op = true
  don'

map: isFault, just => Just(false)


|               |            |             | should    |               |
|               |            | after       | extract   |               |
| pred          | subject    | map         | before !! | should return |
| ------------- | ---------- | ----------- | --------- | ------------- |
| isNothing     | Nothing()  | Nothing()   | no        | true          |
| isFault       | Just()     | Just(false) | yes       | false         |


new

|               |            |             | should    |               |
|               |            | after       | extract   |               |
| pred          | subject    | map         | before !! | should return |
| ------------- | ---------- | ----------- | --------- | ------------- |
| isNothing     | Nothing()  | Just(true)  | yes       | true          |
| isFault       | Just()     | Just(false) | yes       | false         |

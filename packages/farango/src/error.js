const errors = [
  'ARANGO_CANT_OPEN_CONNECTION',
  'ARANGO_CANT_CREATE_DB',
  'ARANGO_CANT_USE_SPECIFIED_DB',
  'ARANGO_CANT_CREATE_COLLECTION',
  'ARANGO_CANT_INSERT_DOC',
  'ARANGO_CANT_GET_DOC_BY_ID',
  'ARANGO_CANT_DROP_DB',
]

export const ec = errors.reduce((codes, cur) => ({ ...codes, [cur]: cur }), {})

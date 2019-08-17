// return length of array or str.  Fault on non array/str
export const fLength = curry((length, $fm) => {
  if (isNonJustFm($fm)) return $fm
  const val = extract($fm)
  if (isNotArray(val) && isNotString(val)) {
    return Fault({op: 'fLength()', msg: 'non string/array supplied for length check'})
  }
  return Just(val.length)
})

// check length of array or string.  fault on non array/str
export const fIsLength = curry((length, $fm) => {
  const arrOrStrLen = fLength($fm)
  return isFault(arrOrStrLen) ?  arrOrStrLen : fEq(length, arrOrStrLen)
})

export const fIsNotLength = curry((length, $fm) =>
  !fIsLength(length, $fm))


// export const isArrayOfLength = curry((length, $fm) => {
//   if (isNonJustFm($fm)) return $fm
//   const val = extract($fm)
//   return isArray(val) && val.length === length
// });

// export const fIsNotArrayOfLength = curry((length, $fm) =>
//   !isArrayOfLength(length, $fm))

export const fEq = curry(($val1, $val2) => extract($val1) === extract($val2))

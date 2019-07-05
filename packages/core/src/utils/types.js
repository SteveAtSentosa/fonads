import { any, not, complement, prop, curry, flatten, isNil, isEmpty } from 'ramda'
import { isArray, isString, isFunction } from 'ramda-adjunct'

// if input is an array return as it, otherwise return array with single element of input
export const arrayify = input => isArray(input) ? input : [input]
export const flatArrayify = input => flatten(arrayify(input))

// Given the predicate fxn `checkPred`, check that all elements of `array` pass
// ([] -> (a->bool)) -> boolean
export const isArrayOf = (checkPred, array) =>
  isArray(array) && not(any(complement(checkPred), array))

export const isStringArray = array => isArrayOf(isString, array)
export const isNotStringArray = complement(isStringArray)

export const isEmptyArray = toCheck => isArray(toCheck) && toCheck.length === 0

export const isEmptyOrNil = toCheck => isEmpty(toCheck) || isNil(toCheck)

// 'propName' -> {obj} -> bool
export const propIsFn = curry((propName, obj) => isFunction(prop(propName, obj)))

